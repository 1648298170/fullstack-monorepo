import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { RoleModule } from "./modules/role/role.module";
import { MenuModule } from "./modules/menu/menu.module";
import { PrismaModule } from "./infra/database/prisma.module";
import { LoggerModule } from "./infra/logger/logger.module";
import { RedisModule } from "./infra/redis/redis.module";
import { SnowflakeModule } from "./infra/snowflake/snowflake.module";
import { QueueModule } from "./infra/queue/queue.module";
import { GuardsModule } from "./common/guards/guards.module";
import configuration from "./config/configuration";
import { validationSchema } from "./config/validation";

@Module({
  imports: [
    // 全局配置模块，注册后其他模块无需重复导入即可使用 ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
      // 根据 NODE_ENV 加载对应的环境文件，回退到 .env
      envFilePath: [`.env.${process.env.NODE_ENV ?? "development"}`, ".env"],
      // 加载结构化配置工厂函数
      load: [configuration],
      // 启动时校验环境变量，格式不合法则拒绝启动
      validationSchema,
    }),
    // 全局日志模块，注册后所有模块均可注入 AppLogger
    LoggerModule,
    // 全局 Prisma 模块，注册后所有模块均可注入 PrismaService
    PrismaModule,
    // 全局 Redis 模块，注册后所有模块均可注入 RedisService
    RedisModule,
    // 全局雪花 ID 模块，注册后所有模块均可注入 SnowflakeIdService
    SnowflakeModule,
    // 全局队列模块，注册后所有模块均可注入 QueueService（基于 BullMQ + Redis）
    QueueModule,
    // 全局守卫模块，注册后所有接口默认受 AuthGuard + RolesGuard 保护
    GuardsModule,
    // 认证模块，提供注册/登录接口和 JWT 签发/验证能力
    AuthModule,
    // 用户管理模块
    UserModule,
    // 角色管理模块
    RoleModule,
    // 菜单管理模块
    MenuModule,
  ],
})
export class AppModule {}
