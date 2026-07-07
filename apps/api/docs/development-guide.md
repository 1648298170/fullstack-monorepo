# 本地开发指南

本文档说明如何在本地启动项目、配置环境变量，并处理常见开发问题。

## 基础要求

| 依赖    | 说明                         |
| ------- | ---------------------------- |
| Node.js | 项目使用 Node.js 22          |
| pnpm    | 项目包管理器                 |
| MySQL   | 业务数据库                   |
| Redis   | 缓存、验证码、队列等功能依赖 |

建议先确认版本：

```bash
node -v
pnpm -v
```

## 安装依赖

```bash
pnpm install
```

安装完成后会执行 `postinstall`，自动运行：

```bash
prisma generate
```

如果安装后 Prisma 类型不正确，可以手动执行：

```bash
pnpm run prisma:generate
```

## 环境变量

项目按 `NODE_ENV` 加载环境文件：

```text
.env.{NODE_ENV}
.env
```

本地开发常用 `.env.development`。可以参考 `.env.example` 创建。

关键配置：

```env
NODE_ENV=development
APP_PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=nestjs_dev

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_SECRET=dev-secret-change-in-production
```

注意：不要提交 `.env`、`.env.development`、`.env.production`、`.env.test`。

## 启动依赖服务

项目启动前需要 MySQL 和 Redis 可用。

检查 MySQL：

```bash
mysql -h localhost -P 3306 -u root -p
```

检查 Redis：

```bash
redis-cli ping
```

返回 `PONG` 表示 Redis 可用。

## 启动项目

开发模式：

```bash
pnpm start:dev
```

构建：

```bash
pnpm run build
```

生产模式启动：

```bash
pnpm run start:prod
```

## 常用访问地址

| 地址                                  | 说明         |
| ------------------------------------- | ------------ |
| `http://localhost:3000/health`        | 健康检查     |
| `http://localhost:3000/api-docs`      | API 文档     |
| `http://localhost:3000/api-docs-json` | OpenAPI JSON |

如果 `.env.development` 中修改了 `APP_PORT`，访问地址要同步替换端口。

## 端口占用处理

如果启动时报错：

```text
Error: listen EADDRINUSE: address already in use :::3000
```

说明端口已被其他进程占用。

Windows 查看端口占用：

```powershell
netstat -ano | findstr :3000
```

结束指定进程：

```powershell
Stop-Process -Id <PID> -Force
```

也可以临时换端口：

```powershell
$env:APP_PORT='3010'; pnpm start:dev
```

## dist 缺文件处理

如果启动时报错：

```text
Cannot find module './app.module'
```

通常是 TypeScript 增量编译缓存与 `dist/` 输出不一致。

处理方式：

```bash
pnpm run build
```

如果仍然异常，删除 `dist/` 后重新启动：

```powershell
Remove-Item -Recurse -Force dist
pnpm start:dev
```

项目已将 `tsBuildInfoFile` 放到 `dist/` 下，避免根目录增量缓存干扰编译输出。

## 开发前检查清单

1. 已安装依赖：`pnpm install`
2. MySQL 已启动
3. Redis 已启动
4. `.env.development` 已配置
5. Prisma Client 已生成：`pnpm run prisma:generate`
6. 数据库迁移已执行：`pnpm run prisma:migrate`

## 常用质量命令

```bash
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm run build
```

提交前至少保证相关单元测试通过。涉及公共模块、认证、数据库结构时，建议跑完整测试和构建。
