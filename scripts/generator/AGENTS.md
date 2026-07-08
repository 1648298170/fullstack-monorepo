# pnpm g 代码生成器

`pnpm g` / `pnpm generate` 的实现入口是 `scripts/generate.mjs`，本目录是它的内部实现层。
本目录下代码必须用 `.mjs`（Node 原生 ESM，无构建步骤），测试用 Vitest 直接跑源文件。

## 编排链路

```text
generate.mjs                        # CLI 编排：解析参数 → 展示计划 → 校验 → 提交事务
└─ generator/
   arguments.mjs                    # CLI 参数解析、--help 文本、类型枚举
   plan-generation.mjs   ★720 行    # 核心：每种生成类型对应一个 planXxx 规划函数
   templates.mjs                    # 所有模板字符串函数（组件/页面/Feature/Store/Hook/Composable）
   names.mjs                        # 名称风格转换：kebab / Pascal / camel / DisplayName
   app-template.mjs                 # 新应用生成：复制 templates/apps/<framework> 并替换变量
   file-updates.mjs                 # 增量改动（往 index.ts 追加 export、往 package.json 加 export）
   transaction.mjs                  # validateChanges + applyChanges：对 fs 的唯一写入出口
   *.test.mjs                       # plan / app-generation 单元测试
```

**关键不变量**：规划层（`plan-generation.mjs`）只产出 `changes` 描述对象数组，
**绝不直接调用 fs 写入**；所有写入必须经 `transaction.mjs` 的 `applyChanges`。
这保证 `--dry-run` 与真实运行走同一份计划，测试只需断言 changes 即可。

## 当前支持的生成类型

`app`、`component`、`feature`、`page`、`store`、`hook`、`composable`。
枚举集中在 `plan-generation.mjs` 的 `supportedTypes`。**新增类型必须同步三处**：
1. `arguments.mjs` 的参数解析与 `--help` 文本
2. `plan-generation.mjs` 的 `supportedTypes` + 新的 `planXxx` 函数
3. `templates.mjs` 的模板函数 + `plan-generation.test.mjs` 的规划层测试

测试规范要求先扩展规划层测试，再加模板和 CLI 帮助 —— 不要在模板函数里直接堆 CLI 逻辑。

## 框架识别约定

生成器**不依赖应用名包含 `react`/`vue`**来判断框架。`resolveApp` 读取目标应用
`package.json` 的 `dependencies`：声明了 `react` 当作 React 应用，声明了 `vue` 当作 Vue
应用。这是为了让任意名称的应用都能继续使用生成器。因此新应用名只能含字母/数字/短横线，
且**单应用禁止同时直接声明 `react` 和 `vue`**（生成器会拒绝并报错，这是主动保护）。

## 事务与命名规则

- `transaction.validateChanges`：校验所有变更路径不冲突、不覆盖已存在文件（除非该类型
  允许）。默认任何生成类型**拒绝覆盖已有文件**。
- `transaction.applyChanges`：唯一调用 `fs` 写入的地方；新增/更新/重命名都走这一层。
- 命名风格由 `names.mjs` 统一提供，不要在模板里手写大小写转换。`--name` 参数必须以英文字母
  开头，支持 kebab-case / camelCase / PascalCase 输入，规划层会按目标产物自动派生各种变体。

## 验证

```bash
pnpm test:scripts            # 跑 scripts/generator + scripts/version 的 Vitest
pnpm verify:app-templates    # 生成临时 React/Vue 应用并执行 lint/typecheck/test/build（仓库根执行）
```

`verify:app-templates` 会临时创建 `apps/template-{react,vue}-verification`、执行完整
lint/typecheck/test/build、再清理并恢复 `pnpm-lock.yaml`。修改模板或生成器后**必须**运行它。

## 禁止

- 在规划函数（`planXxx`）里直接 `writeFile` / `mkdir`；只能返回 `changes`。
- 在生成器或模板中引入 TypeScript 或构建步骤；本目录保持纯 `.mjs`。
- 通过应用名前缀判断框架；始终读 `package.json` 依赖。
- 新增生成类型时只改模板函数而不补规划层测试。
