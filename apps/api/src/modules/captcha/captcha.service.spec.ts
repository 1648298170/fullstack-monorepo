import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { BizException } from "../../common/result/biz.exception";
import { RedisService } from "../../infra/redis/redis.service";
import { CaptchaService } from "./captcha.service";
import type { RequestMeta } from "./interfaces/request-meta.interface";

describe("CaptchaService", () => {
  let service: CaptchaService;
  let store: Map<string, string>;
  let redisService: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    incr: ReturnType<typeof vi.fn>;
    expire: ReturnType<typeof vi.fn>;
  };
  let config: Record<string, unknown>;
  let configService: { get: ReturnType<typeof vi.fn> };

  const meta: RequestMeta = {
    ip: "127.0.0.1",
    userAgent: "Vitest Browser",
  };

  beforeEach(async () => {
    store = new Map<string, string>();
    config = {
      "captcha.enabled": true,
      "captcha.requiredAlways": false,
      "captcha.sliderTtl": 120,
      "captcha.tokenTtl": 300,
      "captcha.tolerance": 5,
      "captcha.minDuration": 300,
      "captcha.bindIp": false,
      "loginSecurity.accountCaptchaThreshold": 3,
      "loginSecurity.ipCaptchaThreshold": 5,
      "loginSecurity.failTtl": 900,
    };

    redisService = {
      set: vi.fn((key: string, value: string | number | Buffer) => {
        store.set(key, String(value));
        return Promise.resolve("OK");
      }),
      get: vi.fn((key: string) => {
        return Promise.resolve(store.get(key) ?? null);
      }),
      del: vi.fn((...keys: string[]) => {
        let deleted = 0;
        keys.forEach((key) => {
          if (store.delete(key)) {
            deleted += 1;
          }
        });
        return Promise.resolve(deleted);
      }),
      incr: vi.fn((key: string) => {
        const next = Number(store.get(key) ?? 0) + 1;
        store.set(key, String(next));
        return Promise.resolve(next);
      }),
      expire: vi.fn(() => Promise.resolve(true)),
    };

    configService = {
      get: vi.fn((key: string, defaultValue?: unknown): unknown => {
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CaptchaService,
        { provide: RedisService, useValue: redisService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CaptchaService>(CaptchaService);
  });

  it("should create a slider challenge and store the server-side answer", async () => {
    const result = await service.createSliderChallenge(meta);
    const redisKey = `captcha:slider:${result.captchaId}`;
    const stored = JSON.parse(store.get(redisKey) ?? "{}") as {
      x?: number;
      y?: number;
      userAgentHash?: string;
    };

    expect(result.captchaId).toMatch(/^cpt_/);
    expect(result.width).toBe(320);
    expect(result.y).toBe(stored.y);
    expect(stored.x).toBeGreaterThanOrEqual(60);
    expect(stored.userAgentHash).toBeDefined();
    expect(redisService.set).toHaveBeenCalledWith(
      redisKey,
      expect.any(String),
      120
    );
  });

  it("should verify a valid slider track and issue a one-time captcha token", async () => {
    const challenge = await service.createSliderChallenge(meta);
    const challengeKey = `captcha:slider:${challenge.captchaId}`;
    const state = JSON.parse(store.get(challengeKey) ?? "{}") as { x: number };

    const result = await service.verifySliderCaptcha(
      {
        captchaId: challenge.captchaId,
        x: state.x,
        track: [
          { x: 0, y: 0, t: 0 },
          { x: 20, y: 1, t: 100 },
          { x: 80, y: -1, t: 220 },
          { x: state.x - 3, y: 0, t: 350 },
          { x: state.x, y: 1, t: 520 },
        ],
      },
      meta
    );

    expect(result.captchaToken).toMatch(/^cap_/);
    expect(result.expiresIn).toBe(300);
    expect(store.has(challengeKey)).toBe(false);
    expect(store.has(`captcha:token:${result.captchaToken}`)).toBe(true);
  });

  it("should reject invalid slider position and delete the used challenge", async () => {
    const challenge = await service.createSliderChallenge(meta);
    const challengeKey = `captcha:slider:${challenge.captchaId}`;

    await expect(
      service.verifySliderCaptcha(
        {
          captchaId: challenge.captchaId,
          x: 0,
          track: [
            { x: 0, y: 0, t: 0 },
            { x: 5, y: 0, t: 100 },
            { x: 10, y: 0, t: 200 },
            { x: 15, y: 0, t: 350 },
            { x: 20, y: 0, t: 500 },
          ],
        },
        meta
      )
    ).rejects.toThrow(BizException);

    expect(store.has(challengeKey)).toBe(false);
  });

  it("should consume captcha token once and reject replay", async () => {
    const challenge = await service.createSliderChallenge(meta);
    const state = JSON.parse(
      store.get(`captcha:slider:${challenge.captchaId}`) ?? "{}"
    ) as { x: number };
    const { captchaToken } = await service.verifySliderCaptcha(
      {
        captchaId: challenge.captchaId,
        x: state.x,
        track: [
          { x: 0, y: 0, t: 0 },
          { x: 10, y: 1, t: 80 },
          { x: 50, y: 0, t: 180 },
          { x: state.x - 2, y: -1, t: 330 },
          { x: state.x, y: 0, t: 450 },
        ],
      },
      meta
    );

    await expect(
      service.consumeCaptchaToken(captchaToken, meta)
    ).resolves.toBeUndefined();
    await expect(
      service.consumeCaptchaToken(captchaToken, meta)
    ).rejects.toThrow(BizException);
  });

  it("should require captcha after account failure threshold", async () => {
    await service.recordLoginFailed("admin", meta.ip);
    await service.recordLoginFailed("admin", meta.ip);

    await expect(service.needCaptcha("admin", meta.ip)).resolves.toBe(false);

    await service.recordLoginFailed("admin", meta.ip);

    await expect(service.needCaptcha("admin", meta.ip)).resolves.toBe(true);
    expect(redisService.expire).toHaveBeenCalledWith(
      "login:fail:account:admin",
      900
    );
  });

  it("should skip captcha when feature is disabled", async () => {
    config["captcha.enabled"] = false;

    await service.recordLoginFailed("admin", meta.ip);
    await service.recordLoginFailed("admin", meta.ip);
    await service.recordLoginFailed("admin", meta.ip);

    await expect(service.needCaptcha("admin", meta.ip)).resolves.toBe(false);
  });
});
