import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "../../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getOffsetString } from "../../common/time/timezone";

/**
 * Prisma 服务
 * 封装 PrismaClient 实例，管理数据库连接生命周期
 * - onModuleInit: 应用启动时自动连接数据库
 * - onModuleDestroy: 应用关闭时自动断开连接
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly configService: ConfigService) {
    // 使用 @prisma/adapter-mariadb 适配器（Prisma 7 中 MySQL 与 MariaDB 共用此适配器）
    const adapter = new PrismaMariaDb({
      host: configService.get<string>("database.host", "localhost"),
      port: configService.get<number>("database.port", 3306),
      user: configService.get<string>("database.username", "root"),
      password: configService.get<string>("database.password", ""),
      database: configService.get<string>("database.database", "nestjs_dev"),
      connectionLimit: 5,
      // DATETIME 列按项目时区存取(如 +08:00),SELECT 直接看到本地时间
      timezone: getOffsetString(
        configService.get<string>("app.timezone", "Asia/Shanghai")
      ),
    });

    super({
      adapter,
      // 开发环境启用查询日志
      log:
        configService.get<string>("nodeEnv") === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "info" },
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ]
          : [
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("数据库连接已建立");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log("数据库连接已断开");
  }
}
