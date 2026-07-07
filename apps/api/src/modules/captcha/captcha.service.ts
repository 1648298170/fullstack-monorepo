import { createHash, randomInt, randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { BizException } from "../../common/result/biz.exception";
import { RedisService } from "../../infra/redis/redis.service";
import type { VerifySliderCaptchaDto } from "./dto/verify-slider-captcha.dto";
import type { RequestMeta } from "./interfaces/request-meta.interface";

interface SliderChallengeState {
  /** 后端生成的真实缺口横坐标，不返回给前端。 */
  x: number;
  /** 前端展示滑块用的纵坐标。 */
  y: number;
  ip: string;
  userAgentHash: string;
  createdAt: number;
}

interface CaptchaTokenState {
  /** 票据来源 challenge，便于排查问题。 */
  captchaId: string;
  ip: string;
  userAgentHash: string;
  createdAt: number;
}

/**
 * 滑块验证码服务。
 *
 * 设计上分两步：滑块校验成功后换取 captchaToken，登录接口只消费 token。
 * 这样验证码逻辑和账号密码校验解耦，也方便后续替换为第三方验证码。
 */
@Injectable()
export class CaptchaService {
  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService
  ) {}

  /** 创建滑块挑战，并把真实答案存入 Redis。 */
  async createSliderChallenge(meta: RequestMeta) {
    const width = 320;
    const captchaId = `cpt_${randomUUID()}`;
    const state: SliderChallengeState = {
      x: randomInt(60, width - 50),
      y: randomInt(30, 120),
      ip: meta.ip,
      userAgentHash: this.hash(meta.userAgent),
      createdAt: Date.now(),
    };

    await this.redisService.set(
      this.sliderKey(captchaId),
      JSON.stringify(state),
      this.configService.get<number>("captcha.sliderTtl", 120)
    );

    return {
      captchaId,
      width,
      y: state.y,
      expiresIn: this.configService.get<number>("captcha.sliderTtl", 120),
    };
  }

  /** 校验滑块挑战，成功后签发一次性 captchaToken。 */
  async verifySliderCaptcha(
    dto: VerifySliderCaptchaDto,
    meta: RequestMeta
  ): Promise<{ captchaToken: string; expiresIn: number }> {
    const key = this.sliderKey(dto.captchaId);
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BizException("CAPTCHA_INVALID");
    }

    const state = JSON.parse(raw) as SliderChallengeState;
    await this.redisService.del(key);

    if (!this.sameClient(state, meta) || !this.isHumanLike(dto, state)) {
      throw new BizException("CAPTCHA_INVALID");
    }

    const captchaToken = `cap_${randomUUID()}`;
    const tokenState: CaptchaTokenState = {
      captchaId: dto.captchaId,
      ip: meta.ip,
      userAgentHash: this.hash(meta.userAgent),
      createdAt: Date.now(),
    };
    const tokenTtl = this.configService.get<number>("captcha.tokenTtl", 300);

    await this.redisService.set(
      this.tokenKey(captchaToken),
      JSON.stringify(tokenState),
      tokenTtl
    );

    return { captchaToken, expiresIn: tokenTtl };
  }

  /** 登录前消费一次性 captchaToken；成功或失败都不能再次使用。 */
  async consumeCaptchaToken(
    captchaToken: string | undefined,
    meta: RequestMeta
  ): Promise<void> {
    if (!captchaToken) {
      throw new BizException("CAPTCHA_REQUIRED");
    }

    const key = this.tokenKey(captchaToken);
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BizException("CAPTCHA_INVALID");
    }

    // Token is one-time use; delete before final validation to block replay.
    await this.redisService.del(key);

    const state = JSON.parse(raw) as CaptchaTokenState;
    if (!this.sameClient(state, meta)) {
      throw new BizException("CAPTCHA_INVALID");
    }
  }

  /** 根据登录失败次数判断本次登录是否必须携带验证码票据。 */
  async needCaptcha(username: string, ip: string): Promise<boolean> {
    if (!this.configService.get<boolean>("captcha.enabled", true)) {
      return false;
    }
    if (this.configService.get<boolean>("captcha.requiredAlways", false)) {
      return true;
    }

    const [accountFails, ipFails] = await Promise.all([
      this.redisService.get(this.accountFailKey(username)),
      this.redisService.get(this.ipFailKey(ip)),
    ]);

    return (
      Number(accountFails ?? 0) >=
        this.configService.get<number>(
          "loginSecurity.accountCaptchaThreshold",
          3
        ) ||
      Number(ipFails ?? 0) >=
        this.configService.get<number>("loginSecurity.ipCaptchaThreshold", 5)
    );
  }

  /** 记录账号和 IP 两个维度的短期登录失败次数。 */
  async recordLoginFailed(username: string, ip: string): Promise<void> {
    const ttl = this.configService.get<number>("loginSecurity.failTtl", 900);
    await Promise.all([
      this.incrWithTtl(this.accountFailKey(username), ttl),
      this.incrWithTtl(this.ipFailKey(ip), ttl),
    ]);
  }

  /** 登录成功后清理失败计数，避免用户长期被验证码打扰。 */
  async clearLoginFailed(username: string, ip: string): Promise<void> {
    await this.redisService.del(
      this.accountFailKey(username),
      this.ipFailKey(ip)
    );
  }

  /** 首次写入失败计数时设置 TTL，避免 Redis 累积永久计数 key。 */
  private async incrWithTtl(key: string, ttl: number): Promise<void> {
    const count = await this.redisService.incr(key);
    if (count === 1) {
      await this.redisService.expire(key, ttl);
    }
  }

  /** 轻量轨迹校验：位置、轨迹点数量、移动变化和耗时都要合理。 */
  private isHumanLike(
    dto: VerifySliderCaptchaDto,
    state: SliderChallengeState
  ): boolean {
    const tolerance = this.configService.get<number>("captcha.tolerance", 5);
    const minDuration = this.configService.get<number>(
      "captcha.minDuration",
      300
    );
    const duration = dto.track.at(-1)?.t ?? 0;
    const uniqueXCount = new Set(dto.track.map((point) => point.x)).size;

    return (
      Math.abs(dto.x - state.x) <= tolerance &&
      dto.track.length >= 5 &&
      uniqueXCount >= 3 &&
      duration >= minDuration
    );
  }

  /** 校验 challenge/token 是否来自同一客户端环境。 */
  private sameClient(
    state: Pick<SliderChallengeState, "ip" | "userAgentHash">,
    meta: RequestMeta
  ): boolean {
    const sameUserAgent = state.userAgentHash === this.hash(meta.userAgent);
    const bindIp = this.configService.get<boolean>("captcha.bindIp", false);
    return sameUserAgent && (!bindIp || state.ip === meta.ip);
  }

  /** 对客户端信息做 hash 后再存 Redis，减少敏感信息暴露。 */
  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private sliderKey(captchaId: string): string {
    return `captcha:slider:${captchaId}`;
  }

  private tokenKey(captchaToken: string): string {
    return `captcha:token:${captchaToken}`;
  }

  private accountFailKey(username: string): string {
    return `login:fail:account:${username}`;
  }

  private ipFailKey(ip: string): string {
    return `login:fail:ip:${ip}`;
  }
}
