# Git 提交与推送规范

提交代码、创建提交信息、推送到远程、处理钩子失败时，先读：

```text
commitlint.config.js
lint-staged.config.js
.husky/pre-commit
.husky/commit-msg
docs/guides/project-guide.md（第 13、14 章）
docs/conventions/environment-variables.md（Git 提交规则章节）
docs/conventions/naming.md（提交前 Hook 章节）
```

## 提交信息规范

仓库使用 [Conventional Commits](https://www.conventionalcommits.org/)，由
`commitlint.config.js` 继承 `@commitlint/config-conventional` 强制校验。`commit-msg`
钩子会在每次提交时调用 `pnpm exec commitlint --edit`。

格式：

```text
<type>(<scope>): <subject>

<body>
```

- `type` 必填，必须是 Conventional Commits 允许的类型。
- `scope` 可选，建议写受影响的 workspace 或模块（例如 `api`、`vue-web`、`generator`、
  `agents`、`deps`）。
- `subject` 必填，简短描述本次变更；默认使用中文，与现有提交风格保持一致。
- `body` 可选，说明动机、范围或副作用；多个要点用无序列表。

常用类型：

```txt
feat:     新增业务能力或新功能
fix:      修复缺陷
refactor: 调整实现但不改变对外行为
perf:     提升性能且不改变行为
test:     新增或调整测试
docs:     修改文档、README、AGENTS.md、规范
build:    构建系统、依赖、产物相关
ci:       CI 配置（当前仓库未启用 GitLab CI，但仍保留该类型）
chore:    工具链、脚本、工程杂项
style:    仅格式化，不影响代码语义
revert:   回滚某次提交
```

示例：

```bash
git commit -m "feat(auth): 新增滑块验证码登录" \
           -m "- 新增 captcha 模块
- auth.controller 接入验证码校验"
```

提交信息校验失败时，commit 会被 `commit-msg` 钩子拦截，**不要**用 `--no-verify`
跳过；应修正信息后重新提交。

## 提交前钩子

`.husky/pre-commit` 在每次提交时执行：

```bash
pnpm exec lint-staged     # 只处理暂存文件：prettier、eslint --fix、stylelint --fix
pnpm lint:naming          # Workspace 包名与目录名一致性
pnpm typecheck            # 全仓库类型检查
pnpm test                 # 全仓库单元测试
```

要点：

- `lint-staged` 只处理 `git add` 过的文件，不会动未暂存改动。
- `lint:naming` 校验 `@apps/*`、`@repo/*` 等包名与目录映射，规则在
  `scripts/check-workspace-names.mjs`。
- 钩子失败必须修复根因，不要用 `--no-verify` 绕过。绕过会让命名冲突、类型错误和
  失败测试直接进入主干。
- 仓库**没有**配置 `pre-push` 钩子，因此推送前要自己确认远端不会有新的冲突提交。

## 提交粒度

- 一个提交只做一件事。不要把无关重构、格式化、依赖升级和业务改动塞进同一次提交。
- 纯格式化用 `style:`，纯文档用 `docs:`，纯依赖升级用 `build(deps):` 或 `chore:`。
- 涉及多个 workspace 的同一类改动（例如升级 catalog 版本）可以合并为一次提交，
  但 subject 和 body 要写清楚影响范围。
- 回滚用户已有改动前必须先确认；除非用户明确要求，不要代替用户回滚。

## 禁止提交的内容

参考 `docs/conventions/environment-variables.md` 的「Git 提交规则」章节与
`.gitignore`：

禁止提交：

- `.env.local`、`.env.*.local`：本机或机器私有覆盖。
- Token、私钥、数据库密码、服务端密钥、`*.pem`、`*.key`。
- `apps/*/dist/`、`packages/*/dist/`、`apps/*/coverage/`：构建与覆盖率产物。
- `reports/`：Playwright、打包分析等临时产物。
- `.turbo/`、`*.tsbuildinfo`：Turbo 与 tsc 增量缓存。
- `apps/api/src/generated/prisma/`：Prisma Client 自动产物。
- `node_modules/`、`pnpm-store/`。
- 个人 IDE 主题、字体、窗口布局、本地绝对路径（`.vscode/settings.json` 中已剔除）。

允许提交的环境文件：

- `.env`、`.env.example`、`.env.development`、`.env.test`、`.env.uat`、
  `.env.production` 中**只允许公开值**。任何 `VITE_*` 变量都会进入浏览器产物，
  不能用来保存秘密。

如果 `git status` 中出现上述禁止文件，说明 `.gitignore` 被绕过或文件被误 `git add`，
提交前用 `git restore --staged <path>` 移出暂存区。

## 推送规范

- 默认推送到 `origin/main`。推送前确认本地分支已通过全部 pre-commit 钩子。
- 仓库当前未启用 CI、未启用强制 Code Review，**不要**因此放宽自查标准；pre-commit
  钩子是最后一道自动化防线。
- 推送前若远端已有新提交，优先 `git pull --rebase` 保持线性历史，避免无意义的合并提交。
- **禁止** `git push --force` 到 `main`；如确需重写历史，必须先与仓库维护者确认。
- **禁止** `git push --tags` 推送未经确认的标签；当前仓库未启用 changesets/发布流，
  不要擅自创建版本标签。
- 推送后如发现错误，优先新增 `fix:` 提交修复，而不是强制覆盖远端历史。

## AI 协作场景下的额外约束

- AI 助手只在用户**明确要求**时执行 `git commit` 和 `git push`，不要在任务结束时
  自动提交。
- 提交前必须检查 `git status`、`git diff` 和 `git log --oneline -5`，确认暂存内容
  与本次任务一致，没有夹带调试代码、临时文件或无关重构。
- 暂存文件用显式路径列表（`git add <path1> <path2> ...`），**不要**用 `git add .`
  或 `git add -A`，避免误把未审查改动一起提交。
- commit message 由 AI 起草时，必须遵守上面的 Conventional Commits 格式，subject
  使用中文，body 说明改动范围和验证情况。
- pre-commit 钩子如果因类型检查或测试失败，必须修复根因后重新提交；**不要**删除
  失败测试或用 `as any` / `@ts-ignore` 压制类型错误来通过钩子。

## 常见问题

| 现象 | 根因 | 处理 |
| --- | --- | --- |
| `commitlint` 拒绝提交 | type 缺失 / subject 为空 / 拼错 type | 按格式重写 message |
| `lint:naming` 失败 | workspace 包名与目录不匹配 | 修 `package.json` 的 `name` 或目录名 |
| `prettier` 改动未暂存文件 | 只 `git add` 了部分文件 | 把相关文件一起 `git add` 再提交 |
| `typecheck` / `test` 失败 | 真实类型或测试缺陷 | 修复根因，不要 `--no-verify` |
| 推送被拒（non-fast-forward） | 远端已有新提交 | `git pull --rebase` 后重试 |
| CRLF / LF 警告 | Windows 检出换行 | 无需处理，`.gitattributes` 与 Git 默认 autocrlf 会标准化 |
