// Prisma 配置文件
// 根据 NODE_ENV 加载对应环境变量，与项目 @nestjs/config 保持一致
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

const env = process.env.NODE_ENV ?? "development";
config({ path: [`.env.${env}`, ".env"] });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // 优先使用 DATABASE_URL 环境变量，否则从散列变量构建连接串
    url:
      process.env["DATABASE_URL"] ??
      `mysql://${process.env["DB_USERNAME"] ?? "root"}:${process.env["DB_PASSWORD"] ?? ""}@${process.env["DB_HOST"] ?? "localhost"}:${process.env["DB_PORT"] ?? "3306"}/${process.env["DB_DATABASE"] ?? "nestjs_dev"}`,
  },
});
