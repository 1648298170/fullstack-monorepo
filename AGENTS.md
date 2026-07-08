# AI 开发入口

本项目是一个基于 pnpm workspace 的前端 monorepo 模板。任何 AI 在修改本仓库代码、配置、
文档、依赖、生成器或测试前，都应先阅读项目级 Skill：

```text
docs/ai/skills/fullstack-monorepo/SKILL.md
```

## 仓库分层速查

```text
apps/{vue-web,react-web}    # 前端业务应用（薄装配层，Vite 8 + ESM）
apps/api/                   # NestJS 后端（CommonJS，Prisma 7 + MariaDB + Redis，有自己的 AGENTS.md）
packages/shared/*           # 框架无关能力（auth/utils/request/config/observability/design-tokens）
packages/{vue,react}/*      # 框架适配（auth/ui）
packages/tooling/*          # 共享工程配置（eslint-config/tsconfig/playwright-config）
templates/apps/{vue,react}  # 应用生成模板（生成器消费，必须与 apps/* 同步，有自己的 AGENTS.md）
scripts/generator/          # pnpm g 代码生成器（有自己的 AGENTS.md）
docs/conventions/*          # 19 篇原始规范（权威来源）
docs/ai/skills/.../references/*  # 按任务类型路由的 AI 速查
```

## 常见任务定位

| 任务 | 先看哪里 |
| --- | --- |
| 改前端应用 / 包 | `docs/ai/skills/.../references/app-development.md` + 对应 `docs/conventions/*` |
| 改后端模块 / Prisma | `apps/api/AGENTS.md` + `apps/api/docs/` |
| 调包边界 / 新增 package | `references/package-boundaries.md` + `docs/conventions/package-boundaries.md` |
| 改生成器 / 模板 | `scripts/generator/AGENTS.md` + `templates/apps/AGENTS.md` |
| 依赖升级 / catalog | `references/dependencies.md` + `docs/conventions/dependency-catalog.md` |
| 测试 / E2E | `references/testing.md` + `docs/conventions/testing.md` |
| 提交前验证 | `references/verification.md`（下方命令的完整矩阵） |

## 工作原则

- 先理解当前代码和相邻实现，再做改动。
- 优先遵守 `README.md`、`docs/guides/project-guide.md` 和 `docs/conventions/*`。
- 使用 `pnpm`，不要使用 npm 或 yarn 安装项目依赖。
- 依赖版本由 `pnpm-workspace.yaml` 的 catalog 统一时，使用方仍要在自己的
  `package.json` 中声明 `catalog:`。
- 修改应用结构、应用依赖或示例代码时，同步检查 `templates/apps/*` 是否需要更新。
- 修改模板或代码生成器后运行 `pnpm verify:app-templates`。
- 新增非平凡代码要写大概中文注释；JSON 文件不写注释。
- 不要回滚用户已有改动，不要混入无关重构。

## 常用验证

按变更范围选择验证命令：

```bash
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm lint:unused
pnpm verify:app-templates
pnpm test:e2e
```

更细的验证矩阵见：

```text
docs/ai/skills/fullstack-monorepo/references/verification.md
```
