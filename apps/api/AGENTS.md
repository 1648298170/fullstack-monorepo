# @apps/api 开发入口

NestJS 11 后端应用。**整个 monorepo 唯一的非 ESM 应用**（CommonJS），承载 RBAC 权限体系、
JWT 认证、滑块验证码、Prisma 7 + MariaDB + Redis + BullMQ 队列。详细业务与 API 行为见
`apps/api/docs/`，本文件只补 AI 导航所需的结构与非显然约定。

## 结构速查

```text
src/
  main.ts               # 入口：全局管道/过滤器/拦截器/Swagger
  app.module.ts         # 根模块
  common/               # 装饰器、过滤器、守卫、拦截器、统一响应、时区工具
  config/               # 环境变量映射 + Joi 校验
  infra/                # Prisma / Redis / BullMQ / 日志 / 雪花 ID
  modules/<domain>/     # 业务模块：auth、user、role、menu、captcha
    *.controller.ts
    *.service.ts        # 业务逻辑
    *.service.spec.ts   # 单元测试（与源码同目录）
    *.module.ts
    dto/                # 请求体（class-validator）
    vo/                 # 响应体（部分模块）
    jwt.strategy.ts     # 仅 auth 模块
  generated/prisma/     # Prisma Client 自动产物 —— 整个目录 gitignore，禁止手改
prisma/                 # schema.prisma / migrations / seed
prisma.config.ts        # 按 NODE_ENV 加载 .env.<env>，DataSource URL 动态拼装
test/                   # E2E setup（加载 reflect-metadata）
vitest.config.ts        # 单元（src/**/*.spec.ts）
vitest.config.e2e.ts    # E2E（test/**/*.e2e-spec.ts，独立配置）
docs/                   # 7 篇开发指南（auth/api-response/prisma/module/testing/development）
Dockerfile              # 构建上下文是仓库根（pnpm deploy 提取产物）
```

## 常见任务定位

| 任务 | 先看哪里 |
| --- | --- |
| 新增业务模块 | `docs/module-development-guide.md` + 现有 `modules/auth/` 作模板 |
| 改 Prisma schema / 迁移 | `docs/prisma-guide.md` + `prisma.config.ts` |
| 改鉴权 / JWT 策略 | `docs/auth-guide.md` + `modules/auth/jwt.strategy.ts` |
| 统一响应格式 | `docs/api-response-guide.md` + `src/common/` |
| 环境变量加载 | `docs/development-guide.md` + `src/config/` |
| E2E 测试 | `docs/testing-guide.md` + `test/` + `vitest.config.e2e.ts` |

## 关键约定（非显然）

- **CommonJS**：`tsconfig` 继承 `@repo/tsconfig/nest-app`（`module: commonjs` + 装饰器元数据）。
  禁止用 `import.meta`、顶层 `await`、`.mjs` 等纯 ESM 语法。应用内脚本统一 `.ts`。
- **两套 Vitest 配置**：单元与 E2E 分开。`pnpm --filter @apps/api test` 只跑 `.spec.ts`；
  E2E 用 `test:e2e:api` 跑 `test/**/*.e2e-spec.ts`。
- **`generated/prisma/` 由 `prisma generate` 产出**，postinstall 自动执行。schema 改动后
  必须重新生成；该目录禁止手工编辑或提交。
- **Prisma DataSource 由 `prisma.config.ts` 动态拼装**：优先读 `DATABASE_URL`，否则从
  `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_DATABASE` 散列变量拼 MySQL 连接串。
- **strict 收紧是渐进式的**：当前 `strict: false`，类型问题在独立任务中修复后逐步收严，
  不要在业务改动中夹带全量 strict 修复。
- **Docker 构建上下文是仓库根**，不是 `apps/api/`，因为使用 `pnpm deploy` 提取可部署目录。

## 禁止

- 直接编辑 `src/generated/prisma/` 下任何文件。
- 在本应用内使用 ESM-only 语法或包（除非确认在 CommonJS 下可加载）。
- 跨过 `infra/` 直接在业务模块里 new PrismaClient / Redis / Queue。
- 把鉴权只放前端 Guard；服务端接口必须独立执行鉴权（见 `docs/conventions/package-boundaries.md`）。
