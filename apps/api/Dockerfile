# NestJS 生产镜像（monorepo 适配版）
#
# 构建命令（在仓库根执行）：
#   docker build -f apps/api/Dockerfile -t apps-api .
#
# 推送前确保根目录 .dockerignore 已排除 node_modules / dist / .git 等。

# ========================
# 阶段 1: 安装、构建、部署提取
# ========================
FROM node:22-alpine AS builder

# 启用 pnpm（版本与 monorepo packageManager 字段一致）
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

WORKDIR /repo

# 复制整个仓库（.dockerignore 排除 node_modules / dist / .git / .docker-data 等）
COPY . .

# 安装所有依赖（含 devDependencies，构建需要）
RUN pnpm install --frozen-lockfile

# 构建 apps/api（产物在 apps/api/dist/）
RUN pnpm --filter @apps/api build

# 用 pnpm deploy 提取独立可部署目录
# deploy 目录包含 apps/api 的 package.json + 生产依赖（hoisted，无 symlink）
# 注意：pnpm deploy 是实验性功能，语法为 pnpm --filter=<name> deploy --prod <target>
RUN pnpm --filter=@apps/api deploy --prod /repo/deploy

# pnpm deploy 不包含构建产物和非 src 资源，手动补充
RUN cp -r apps/api/dist /repo/deploy/dist \
    && cp -r apps/api/prisma /repo/deploy/prisma \
    && cp apps/api/prisma.config.ts /repo/deploy/prisma.config.ts

# ========================
# 阶段 2: 生产运行时
# ========================
FROM node:22-alpine AS production

WORKDIR /app

# 从 deploy 目录复制（已含 dist + node_modules + package.json + prisma）
COPY --from=builder /repo/deploy ./

# 非 root 用户运行
USER node

# 暴露端口（生产环境通过 APP_PORT 环境变量配置，默认 3000）
EXPOSE 3000

# 启动应用
CMD ["node", "dist/main.js"]
