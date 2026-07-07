import { Test, type TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { BizException } from "../../common/result/biz.exception";
import { PrismaService } from "../../infra/database/prisma.service";
import { RedisService } from "../../infra/redis/redis.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { CaptchaService } from "../captcha/captcha.service";
import { AuthService } from "./auth.service";

interface MockUser {
  id: string;
  username: string;
  password: string;
  nickname: string | null;
  roles: string;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

describe("AuthService 手机号认证", () => {
  let service: AuthService;
  let store: Map<string, string>;
  let prisma: {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let redisService: {
    set: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };
  let captchaService: {
    consumeCaptchaToken: ReturnType<typeof vi.fn>;
    needCaptcha: ReturnType<typeof vi.fn>;
    recordLoginFailed: ReturnType<typeof vi.fn>;
    clearLoginFailed: ReturnType<typeof vi.fn>;
  };
  let jwtService: { sign: ReturnType<typeof vi.fn> };
  let snowflakeId: { genString: ReturnType<typeof vi.fn> };

  const mobile = "13800138000";
  const req = {
    ip: "127.0.0.1",
    headers: { "user-agent": "Vitest Browser" },
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as Request;

  const user: MockUser = {
    id: "user-001",
    username: mobile,
    password: "hashed_password",
    nickname: "138****8000",
    roles: "user",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    store = new Map<string, string>();

    prisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
    };

    redisService = {
      set: vi.fn((key: string, value: string | number | Buffer) => {
        store.set(key, String(value));
        return Promise.resolve("OK");
      }),
      get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      del: vi.fn((...keys: string[]) => {
        let deleted = 0;
        keys.forEach((key) => {
          if (store.delete(key)) {
            deleted += 1;
          }
        });
        return Promise.resolve(deleted);
      }),
    };

    captchaService = {
      consumeCaptchaToken: vi.fn(() => Promise.resolve()),
      needCaptcha: vi.fn(() => Promise.resolve(false)),
      recordLoginFailed: vi.fn(() => Promise.resolve()),
      clearLoginFailed: vi.fn(() => Promise.resolve()),
    };

    jwtService = {
      sign: vi.fn((payload: { sub: string }) => `token-${payload.sub}`),
    };
    snowflakeId = { genString: vi.fn().mockReturnValue("user-001") };

    const configService = {
      get: vi.fn((key: string, defaultValue?: unknown): unknown => {
        const config: Record<string, unknown> = {
          "jwt.secret": "test-secret",
          "jwt.accessExpiresIn": "15m",
          "jwt.refreshExpiresIn": "7d",
          "sms.codeTtl": 300,
          "sms.resendInterval": 60,
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: SnowflakeIdService, useValue: snowflakeId },
        { provide: CaptchaService, useValue: captchaService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  /**
   * 注册发码必须先消费滑块验证票据，并写入注册用途验证码。
   */
  it("应在消费滑块验证后发送注册短信验证码", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    const result = await service.sendMobileRegisterCode(
      { mobile, captchaToken: "cap_token" },
      req
    );

    const codeKey = `auth:mobile-code:register:${mobile}`;
    const state = JSON.parse(store.get(codeKey) ?? "{}") as {
      code?: string;
      mobile?: string;
      purpose?: string;
    };

    expect(captchaService.consumeCaptchaToken).toHaveBeenCalledWith(
      "cap_token",
      expect.objectContaining({ ip: "127.0.0.1" })
    );
    expect(result.mobile).toBe(mobile);
    expect(result.expiresIn).toBe(300);
    expect(result.mockCode).toMatch(/^\d{6}$/);
    expect(state).toMatchObject({
      code: result.mockCode,
      mobile,
      purpose: "register",
    });
    expect(redisService.set).toHaveBeenCalledWith(
      `auth:mobile-code-throttle:register:${mobile}`,
      "1",
      60
    );
  });

  /**
   * 已注册手机号不能再次获取注册验证码。
   */
  it("手机号已注册时应拒绝发送注册短信验证码", async () => {
    prisma.user.findFirst.mockResolvedValue(user);

    await expect(
      service.sendMobileRegisterCode({ mobile, captchaToken: "cap_token" }, req)
    ).rejects.toThrow(BizException);

    expect(captchaService.consumeCaptchaToken).toHaveBeenCalled();
    expect(store.has(`auth:mobile-code:register:${mobile}`)).toBe(false);
  });

  /**
   * 注册验证码消费成功后创建用户，并返回 Token。
   */
  it("应在消费注册验证码后完成手机号用户注册", async () => {
    store.set(
      `auth:mobile-code:register:${mobile}`,
      JSON.stringify({
        code: "123456",
        mobile,
        purpose: "register",
        createdAt: Date.now(),
      })
    );
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ ...user, nickname: "tester" });

    const result = await service.mobileRegister({
      mobile,
      code: "123456",
      nickname: "tester",
    });

    expect(store.has(`auth:mobile-code:register:${mobile}`)).toBe(false);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "user-001",
        username: mobile,
        nickname: "tester",
      }),
    });
    expect(result).toEqual({
      accessToken: "token-user-001",
      refreshToken: "token-user-001",
      tokenType: "Bearer",
    });
  });

  /**
   * 登录用途验证码不能用于注册流程。
   */
  it("不允许使用登录短信验证码注册用户", async () => {
    store.set(
      `auth:mobile-code:login:${mobile}`,
      JSON.stringify({
        code: "123456",
        mobile,
        purpose: "login",
        createdAt: Date.now(),
      })
    );

    await expect(
      service.mobileRegister({ mobile, code: "123456" })
    ).rejects.toThrow(BizException);

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  /**
   * 未注册手机号不能获取登录验证码，避免登录流程自动创建用户。
   */
  it("未注册手机号获取登录短信验证码时应被拒绝", async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.sendMobileCode({ mobile, captchaToken: "cap_token" }, req)
    ).rejects.toThrow(BizException);

    expect(captchaService.consumeCaptchaToken).toHaveBeenCalled();
    expect(store.has(`auth:mobile-code:login:${mobile}`)).toBe(false);
  });

  /**
   * 即使 Redis 中存在登录验证码，未注册手机号也不能登录。
   */
  it("手机号用户不存在时应拒绝验证码登录", async () => {
    store.set(
      `auth:mobile-code:login:${mobile}`,
      JSON.stringify({
        code: "123456",
        mobile,
        purpose: "login",
        createdAt: Date.now(),
      })
    );
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.mobileLogin({ mobile, code: "123456" })
    ).rejects.toThrow(BizException);

    expect(store.has(`auth:mobile-code:login:${mobile}`)).toBe(false);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
