# 应用生成模板

`templates/apps/{vue,react}` 是生成新应用时被 `pnpm g app --framework <vue|react>` 复制的
**源模板**，由 `scripts/generator/app-template.mjs` 消费。这两个目录不是可运行应用，
而是脚手架原料；但它们的源码、配置、测试必须与真实业务应用保持结构一致。

## 同步约束（最重要）

真实应用与模板是一一对照的：

```text
templates/apps/vue     ←→  apps/vue-web
templates/apps/react   ←→  apps/react-web
```

**修改任一方的「应用结构、依赖声明、示例 Feature/Page/Store/Hook、错误边界、运行时配置、
Vite/Vitest/Playwright 配置」时，必须同步另一方**，否则新生成的应用会立即偏离仓库规范。
这是本仓库最高频的同步陷阱，也是 `pnpm verify:app-templates` 存在的原因。

| 改动类型 | 同步要求 |
| --- | --- |
| 应用结构、目录约定 | 双向同步 |
| `package.json` 依赖 | 双向同步（模板 `name` 占位符除外） |
| 示例代码（features/app/store/error-handling） | 双向同步 |
| `vite.config.ts` / `vitest.config.ts` / `playwright.config.ts` | 双向同步 |
| 业务专属代码 | 不需要同步（模板不含真实业务） |

## 模板特殊点

- `package.json` 的 `name` 字段在模板里是占位符（如 `__APP_NAME__`），由生成器替换。
  不要在模板里硬编码真实包名。
- 模板 `.env.*` 是示例，与真实应用共享同一套约定（见
  `docs/conventions/environment-variables.md`）。
- 模板包含 `e2e/smoke.spec.ts`，生成器会一并复制，确保新应用开箱即有 E2E 冒烟。
- 模板不包含 `dist/`、`node_modules/`、`.turbo/`、`tsconfig.tsbuildinfo`。

## 验证同步

```bash
pnpm verify:app-templates   # 仓库根执行
```

该脚本会用生成器产出两个临时应用（`apps/template-{react,vue}-verification`），分别运行
lint / typecheck / test / build，再清理并恢复 `pnpm-lock.yaml`。任何模板与生成器、
依赖、规范的偏差都会在这里暴露。

修改 `templates/apps/*` 或 `scripts/generator/*` 后必须运行；修改 `apps/vue-web` /
`apps/react-web` 的**应用骨架代码**后也建议运行，以确认骨架与模板仍然对齐。

## 禁止

- 在模板里硬编码真实业务包名、端口或环境值（应用名、端口由生成器注入）。
- 只改 `apps/vue-web` 或 `apps/react-web` 的骨架而不更新对应模板。
- 把只在真实业务里出现的 Feature / Store / 路由沉淀进模板。
- 跳过 `pnpm verify:app-templates` 直接提交模板或生成器改动。
