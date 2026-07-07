# 测试指南

本文档说明项目中 Vitest 单元测试和 E2E 测试的写法。

## 测试命令

运行全部单元测试：

```bash
pnpm run test
```

监听模式：

```bash
pnpm run test:watch
```

覆盖率：

```bash
pnpm run test:cov
```

E2E 测试：

```bash
pnpm run test:e2e
```

运行指定测试文件：

```bash
.\node_modules\.bin\vitest.cmd run src\modules\auth\auth.service.spec.ts
```

## 文件命名

| 测试类型 | 命名            | 位置    |
| -------- | --------------- | ------- |
| 单元测试 | `*.spec.ts`     | `src/`  |
| E2E 测试 | `*.e2e-spec.ts` | `test/` |

## 单元测试原则

1. 优先测试 Service 的业务逻辑。
2. 外部依赖使用 Mock，不连接真实 MySQL、Redis、第三方服务。
3. 重点覆盖正常路径、业务异常、边界条件。
4. 测试名称使用中文，说明业务行为。
5. 涉及 Redis Key、验证码、权限等逻辑时，要断言关键副作用。

## Service 测试模板

```typescript
import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { PrismaService } from "../../infra/database/prisma.service";
import { ExampleService } from "./example.service";

describe("ExampleService", () => {
  let service: ExampleService;
  let prisma: {
    example: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      example: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ExampleService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
  });

  it("应成功创建示例", async () => {
    prisma.example.create.mockResolvedValue({ id: "1", name: "示例 A" });

    const result = await service.create({ name: "示例 A" });

    expect(result.id).toBe("1");
    expect(prisma.example.create).toHaveBeenCalled();
  });
});
```

## Mock Prisma

按当前 Service 用到的模型和方法最小化 Mock。

```typescript
prisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};
```

不要为了省事把整个 Prisma Client 都 mock 成 `any`。

## Mock Redis

验证码、滑块、节流等测试可以使用 `Map` 模拟 Redis。

```typescript
let store: Map<string, string>;

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
```

## Mock ConfigService

```typescript
const configService = {
  get: vi.fn((key: string, defaultValue?: unknown): unknown => {
    const config: Record<string, unknown> = {
      "sms.codeTtl": 300,
      "sms.resendInterval": 60,
    };
    return config[key] ?? defaultValue;
  }),
};
```

## 异常断言

业务异常使用 `BizException`。

```typescript
await expect(service.findOne("not-exist")).rejects.toThrow(BizException);
```

如果要确认没有写入数据库：

```typescript
expect(prisma.user.create).not.toHaveBeenCalled();
```

如果要确认 Redis Key 被删除：

```typescript
expect(store.has(`auth:mobile-code:login:${mobile}`)).toBe(false);
```

## E2E 测试

E2E 测试适合验证完整 HTTP 流程、全局管道、全局过滤器、拦截器和守卫。

模板：

```typescript
import { Test, type TestingModule } from "@nestjs/testing";
import { type INestApplication } from "@nestjs/common";
import request from "supertest";
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { AppModule } from "../src/app.module";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("应返回健康检查结果", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
  });
});
```

注意：E2E 测试必须在 `afterEach` 中关闭应用，避免资源泄漏。

## 当前认证测试覆盖点

手机号认证相关单测位于：

```text
src/modules/auth/auth.service.spec.ts
```

覆盖内容：

1. 注册发码前消费滑块票据。
2. 注册验证码写入注册用途 Redis Key。
3. 已注册手机号不能再次获取注册验证码。
4. 注册验证码消费后创建用户并返回 Token。
5. 登录验证码不能用于注册。
6. 未注册手机号不能获取登录验证码，也不能验证码登录。

## 提交前建议

小改动至少运行相关测试：

```bash
.\node_modules\.bin\vitest.cmd run <测试文件>
```

公共逻辑、认证、数据库、守卫相关改动建议运行：

```bash
pnpm run test
pnpm run build
```

如果 `build` 失败但失败点与当前改动无关，要在提交说明或交付说明中写清楚。
