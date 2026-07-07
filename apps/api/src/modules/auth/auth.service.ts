import { randomInt, randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../infra/database/prisma.service";
import { RedisService } from "../../infra/redis/redis.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { BizException } from "../../common/result/biz.exception";
import { CaptchaService } from "../captcha/captcha.service";
import type { RequestMeta } from "../captcha/interfaces/request-meta.interface";
import { LoginDto } from "./dto/login.dto";
import { MobileLoginDto } from "./dto/mobile-login.dto";
import { MobileRegisterDto } from "./dto/mobile-register.dto";
import { RegisterDto } from "./dto/register.dto";
import { SendMobileCodeDto } from "./dto/send-mobile-code.dto";

/**
 * JWT Payload 结构。
 * 签发到 Token 中的用户信息。
 */
interface JwtPayload {
  /** 用户 ID（雪花 ID 字符串）。 */
  sub: string;
  /** 用户名。 */
  username: string;
  /** 角色列表。 */
  roles: string[];
}

interface MobileCodeState {
  /** 验证码明文，当前为 Mock 阶段用于本地联调。 */
  code: string;
  /** 绑定手机号，防止验证码跨手机号使用。 */
  mobile: string;
  /** 验证码用途，防止注册码和登录码混用。 */
  purpose: MobileCodePurpose;
  /** 创建时间戳，便于后续扩展审计或风控。 */
  createdAt: number;
}

type MobileCodePurpose = "login" | "register";

/**
 * 认证服务。
 * 负责用户注册、登录验证和 JWT Token 签发。
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly snowflakeId: SnowflakeIdService,
    private readonly captchaService: CaptchaService,
    private readonly redisService: RedisService
  ) {}

  /**
   * 用户注册
   * 1. 检查用户名是否已存在
   * 2. 使用 bcrypt 哈希密码（saltRounds=10）
   * 3. 使用雪花 ID 作为主键创建用户记录
   * 4. 自动签发 Token 返回（注册即登录）
   */
  async register(dto: RegisterDto) {
    // 检查用户名唯一性（排除已软删除的用户）
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existing) {
      throw new BizException("USERNAME_EXISTS", { name: dto.username });
    }

    // 哈希密码（bcrypt，自适应成本因子 10）
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // 使用雪花 ID 作为主键
    const userId = this.snowflakeId.genString();

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        username: dto.username,
        password: hashedPassword,
        nickname: dto.nickname ?? dto.username,
      },
    });

    this.logger.log(`用户注册成功: ${user.username} (ID: ${user.id})`);

    // 签发 Token
    return this.generateTokens({
      sub: user.id,
      username: user.username,
      roles: user.roles.split(","),
    });
  }

  /**
   * 用户登录
   * 1. 根据用户名查找用户
   * 2. 使用 bcrypt 验证密码
   * 3. 签发 Access Token + Refresh Token
   */
  async login(dto: LoginDto, req: Request) {
    const meta = this.getRequestMeta(req);

    if (await this.captchaService.needCaptcha(dto.username, meta.ip)) {
      await this.captchaService.consumeCaptchaToken(dto.captchaToken, meta);
    }

    // 查找用户（排除已软删除的）
    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (!user) {
      await this.captchaService.recordLoginFailed(dto.username, meta.ip);
      throw new BizException("BAD_CREDENTIALS");
    }

    // 检查账户状态
    if (!user.isActive) {
      throw new BizException("ACCOUNT_DISABLED");
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.captchaService.recordLoginFailed(dto.username, meta.ip);
      throw new BizException("BAD_CREDENTIALS");
    }

    // 登录成功后清理短期失败计数。
    await this.captchaService.clearLoginFailed(dto.username, meta.ip);
    this.logger.log(`用户登录成功: ${user.username} (ID: ${user.id})`);

    // 签发 Token
    return this.generateTokens({
      sub: user.id,
      username: user.username,
      roles: user.roles.split(","),
    });
  }

  /**
   * 发送手机号登录验证码。
   * 登录发码需要先通过滑块验证，且手机号必须已注册。
   */
  async sendMobileCode(dto: SendMobileCodeDto, req: Request) {
    return this.sendMobileCodeForPurpose(dto, req, "login", async (mobile) => {
      if (!(await this.findMobileUser(mobile))) {
        throw new BizException("BAD_CREDENTIALS");
      }
    });
  }

  /**
   * 发送手机号注册验证码。
   * 注册发码需要先通过滑块验证，且手机号不能已注册。
   */
  async sendMobileRegisterCode(dto: SendMobileCodeDto, req: Request) {
    return this.sendMobileCodeForPurpose(dto, req, "register", (mobile) =>
      this.assertMobileNotRegistered(mobile)
    );
  }

  /**
   * 手机号验证码注册。
   * 注册验证码消费成功后创建用户，并签发登录 Token。
   */
  async mobileRegister(dto: MobileRegisterDto) {
    const mobile = this.normalizeMobile(dto.mobile);
    await this.consumeMobileCode(mobile, dto.code, "register");
    await this.assertMobileNotRegistered(mobile);

    const user = await this.createMobileUser(mobile, dto.nickname);
    this.logger.log(`手机号用户注册成功: ${user.username}`);

    return this.generateTokens({
      sub: user.id,
      username: user.username,
      roles: user.roles.split(","),
    });
  }

  /**
   * 按用途发送手机号验证码。
   * 先消费滑块验证票据，再执行手机号业务校验，最后写入验证码和重发节流 Key。
   */
  private async sendMobileCodeForPurpose(
    dto: SendMobileCodeDto,
    req: Request,
    purpose: MobileCodePurpose,
    assertCanSend: (mobile: string) => Promise<void>
  ) {
    const meta = this.getRequestMeta(req);
    const mobile = this.normalizeMobile(dto.mobile);
    const throttleKey = this.mobileCodeThrottleKey(purpose, mobile);

    await this.captchaService.consumeCaptchaToken(dto.captchaToken, meta);
    await assertCanSend(mobile);

    if (await this.redisService.get(throttleKey)) {
      throw new BizException("CAPTCHA_REQUIRED");
    }

    const code = String(randomInt(100000, 1000000));
    const expiresIn = this.configService.get<number>("sms.codeTtl", 300);
    const resendInterval = this.configService.get<number>(
      "sms.resendInterval",
      60
    );
    const state: MobileCodeState = {
      code,
      mobile,
      purpose,
      createdAt: Date.now(),
    };

    await Promise.all([
      this.redisService.set(
        this.mobileCodeKey(purpose, mobile),
        JSON.stringify(state),
        expiresIn
      ),
      this.redisService.set(throttleKey, "1", resendInterval),
    ]);

    this.logger.log(`Mock 短信验证码已发送: ${mobile} (${purpose})`);

    return {
      mobile,
      expiresIn,
      mockCode: code,
    };
  }

  /**
   * 手机号验证码登录。
   * 只允许已注册用户登录，不在登录流程自动创建用户。
   */
  async mobileLogin(dto: MobileLoginDto) {
    const mobile = this.normalizeMobile(dto.mobile);
    await this.consumeMobileCode(mobile, dto.code, "login");

    const user = await this.findMobileUser(mobile);
    if (!user) {
      throw new BizException("BAD_CREDENTIALS");
    }
    if (!user.isActive) {
      throw new BizException("ACCOUNT_DISABLED");
    }

    this.logger.log(`手机号用户登录成功: ${user.username}`);

    return this.generateTokens({
      sub: user.id,
      username: user.username,
      roles: user.roles.split(","),
    });
  }

  /**
   * 根据 JWT Payload 中的用户 ID 查找用户
   * 由 JwtStrategy.validate() 调用，结果挂载到 request.user
   */
  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        roles: true,
        isActive: true,
        deletedAt: true,
      },
    });

    // 已软删除或被禁用的用户视为不存在
    if (!user || user.deletedAt || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      roles: user.roles.split(","),
    };
  }

  /**
   * 签发 Access Token + Refresh Token
   */
  private generateTokens(payload: JwtPayload) {
    const accessSecret = this.configService.get<string>("jwt.secret")!;
    const accessExpiresIn = this.configService.get<string>(
      "jwt.accessExpiresIn",
      "15m"
    );
    const refreshExpiresIn = this.configService.get<string>(
      "jwt.refreshExpiresIn",
      "7d"
    );

    // expiresIn 支持 string 格式如 "15m"、"7d"（jsonwebtoken 语义）
    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as unknown as number,
    });

    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: accessSecret,
        expiresIn: refreshExpiresIn as unknown as number,
      }
    );

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
    };
  }

  private getRequestMeta(req: Request): RequestMeta {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "",
    };
  }

  /**
   * 消费手机号验证码。
   * 验证码无论正确与否都会删除，避免被重复试探。
   */
  private async consumeMobileCode(
    mobile: string,
    code: string,
    purpose: MobileCodePurpose
  ): Promise<void> {
    const key = this.mobileCodeKey(purpose, mobile);
    const raw = await this.redisService.get(key);
    if (!raw) {
      throw new BizException("CAPTCHA_INVALID");
    }

    await this.redisService.del(key);

    const state = JSON.parse(raw) as MobileCodeState;
    if (
      state.mobile !== mobile ||
      state.code !== code ||
      state.purpose !== purpose
    ) {
      throw new BizException("CAPTCHA_INVALID");
    }
  }

  /**
   * 根据手机号查找未软删除用户。
   * 当前数据表没有独立手机号字段，暂用 username 存储手机号。
   */
  private async findMobileUser(mobile: string) {
    return this.prisma.user.findFirst({
      where: { username: mobile, deletedAt: null },
    });
  }

  /**
   * 断言手机号未注册。
   */
  private async assertMobileNotRegistered(mobile: string): Promise<void> {
    const existing = await this.findMobileUser(mobile);
    if (existing) {
      throw new BizException("USERNAME_EXISTS", { name: mobile });
    }
  }

  /**
   * 创建手机号用户。
   * 当前为验证码登录注册模式，密码使用随机值哈希后占位。
   */
  private async createMobileUser(mobile: string, nickname?: string) {
    const userId = this.snowflakeId.genString();
    const password = await bcrypt.hash(`mobile:${mobile}:${randomUUID()}`, 10);

    try {
      return await this.prisma.user.create({
        data: {
          id: userId,
          username: mobile,
          password,
          nickname: nickname ?? this.maskMobile(mobile),
        },
      });
    } catch {
      const user = await this.prisma.user.findFirst({
        where: { username: mobile, deletedAt: null },
      });
      if (!user) {
        throw new BizException("USERNAME_EXISTS", { name: mobile });
      }
      return user;
    }
  }

  /**
   * 规范化手机号输入。
   */
  private normalizeMobile(mobile: string): string {
    return mobile.trim();
  }

  /**
   * 脱敏手机号，用作默认昵称。
   */
  private maskMobile(mobile: string): string {
    return `${mobile.slice(0, 3)}****${mobile.slice(-4)}`;
  }

  /**
   * 手机验证码 Redis Key。
   */
  private mobileCodeKey(purpose: MobileCodePurpose, mobile: string): string {
    return `auth:mobile-code:${purpose}:${mobile}`;
  }

  /**
   * 手机验证码重发节流 Redis Key。
   */
  private mobileCodeThrottleKey(
    purpose: MobileCodePurpose,
    mobile: string
  ): string {
    return `auth:mobile-code-throttle:${purpose}:${mobile}`;
  }
}
