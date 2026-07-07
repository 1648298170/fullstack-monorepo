# @apps/api

NestJS 后端应用，提供 RBAC 权限体系（用户/角色/权限/菜单）、JWT 认证、滑块验证码等业务能力。作为 `@apps/api` 集成在 monorepo 的 `apps/` 下，与前端应用共享 catalog 和工程规范。

详细开发指南见 [`docs/`](./docs/README.md)。

## 技术栈

- 框架：NestJS 11（CommonJS）
- ORM：Prisma 7 + MariaDB adapter
- 数据库：MariaDB 11（MySQL 兼容）
- 缓存/队列：Redis 7 + BullMQ
- 认证：Passport + JWT（AccessToken / RefreshToken）
- ID 生成：雪花 ID
- API 文档：Swagger（`/api-docs`）
- 测试：Vitest

## 快速启动

后端依赖 MariaDB 和 Redis，首次启动需要先用 Docker 起依赖服务（在**仓库根**目录执行）：

```bash
docker compose up -d
```

启动后端开发服务器（watch 模式）：

```bash
pnpm --filter @apps/api dev
```

默认监听 `http://localhost:3019`，Swagger 文档 `http://localhost:3019/api-docs`。

前端应用（vue-web / react-web）已配置 `/api` 代理到本后端，联调时先启动后端再启动前端。

## 环境配置

环境文件位于 `apps/api/` 根目录，按 `NODE_ENV` 加载：

| 文件               | 用途                     |
| ------------------ | ------------------------ |
| `.env.example`     | 配置模板（提交到仓库）   |
| `.env.development` | 开发环境（已 gitignore） |
| `.env.test`        | 测试环境                 |
| `.env.production`  | 生产环境                 |

首次开发参考 `.env.example` 调整 `.env.development`。`docker-compose.yml`（仓库根）的数据库与 Redis 密码已与 `.env.development` 对齐。

环境变量清单与加载机制见 [本地开发指南](./docs/development-guide.md)。

## 常用命令

```bash
# 开发
pnpm --filter @apps/api dev # watch 模式启动
pnpm --filter @apps/api build # 编译到 dist/

# 测试
pnpm --filter @apps/api test # 单元测试（src/**/*.spec.ts）
pnpm --filter @apps/api test:cov # 覆盖率
pnpm --filter @apps/api test:e2e:api # E2E 测试（test/**/*.e2e-spec.ts）

# 代码质量
pnpm --filter @apps/api lint # ESLint（规则由仓库根配置注入）
pnpm --filter @apps/api typecheck # 类型检查

# Prisma
pnpm --filter @apps/api prisma:generate # 重新生成 Client（postinstall 自动执行）
pnpm --filter @apps/api prisma:migrate # 创建并应用迁移（开发环境）
pnpm --filter @apps/api prisma:migrate:prod # 生产环境应用迁移
pnpm --filter @apps/api prisma:studio # 可视化管理数据
pnpm --filter @apps/api prisma:seed # 执行种子脚本（初始化 admin 账号与基础权限）
```

## 项目结构

```txt
src/
  main.ts              # 应用入口，注册全局管道/过滤器/拦截器/Swagger
  app.module.ts        # 根模块
  common/              # 装饰器、过滤器、守卫、拦截器、统一响应、时区工具
  config/              # 环境变量映射与 Joi 校验
  infra/               # 基础设施：Prisma、Redis、队列、日志、雪花 ID
  modules/             # 业务模块：auth、user、role、menu、captcha
  generated/prisma/    # Prisma 自动生成（gitignore，由 prisma generate 产出）
prisma/                # Schema、迁移、种子脚本
test/                  # 测试 setup（加载 reflect-metadata）
```

新增业务模块的目录结构与步骤见 [模块开发指南](./docs/module-development-guide.md)。

## TypeScript 与 ESLint

- tsconfig 继承 `@repo/tsconfig/nest-app`（CommonJS + 装饰器元数据 + `strictNullChecks`）
- ESLint 规则由仓库根配置统一注入（识别 `@nestjs/core` 依赖自动应用 NestJS 规则）
- 当前 strict 模式采用渐进式收紧策略（`strict: false`），后续独立任务修复类型后逐步收严

## 部署

Docker 构建以仓库根为上下文，使用 `pnpm deploy` 提取独立可部署目录：

```bash
# 在仓库根执行
docker build -f apps/api/Dockerfile -t apps-api .
docker run -p 3000:3000 apps-api
```

生产环境需先执行数据库迁移：

```bash
pnpm --filter @apps/api prisma:migrate:prod
```

端口通过 `APP_PORT` 环境变量配置（默认 3000）。部署前确保 `.env.production` 的数据库和 Redis 地址指向生产环境。
