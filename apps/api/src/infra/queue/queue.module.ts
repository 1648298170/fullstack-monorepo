import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { QUEUE_NAMES } from "./queue.constants";
import { QueueService } from "./queue.service";
import { EmailProcessor } from "./email.processor";

/**
 * 全局队列模块
 *
 * 基于 @nestjs/bullmq + BullMQ 的任务队列基础设施。
 * 复用现有 Redis 连接配置（redis.host/port/password/db）。
 *
 * 注册后可在任意模块中注入 QueueService 使用:
 *
 *   constructor(private readonly queueService: QueueService) {}
 *
 *   // 添加邮件任务
 *   await this.queueService.addEmailJob({ to, subject, body });
 *
 * 已注册队列:
 * - email: 邮件发送队列（含 EmailProcessor 自动消费）
 */
@Global()
@Module({
  imports: [
    // 全局 BullMQ 配置：复用 Redis 连接参数
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password:
            configService.get<string>("redis.password", "") || undefined,
          db: configService.get<number>("redis.db", 0),
        },
        // 默认任务选项（可被单个任务覆盖）
        defaultJobOptions: {
          // 任务最大保留时间（毫秒），超过后自动清理
          removeOnComplete: { age: 24 * 60 * 60 * 1000 },
          removeOnFail: { age: 7 * 24 * 60 * 60 * 1000 },
        },
      }),
    }),
    // 注册所有队列
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL }
      // 后续新增队列在此追加:
      // { name: QUEUE_NAMES.NOTIFICATION },
    ),
  ],
  providers: [QueueService, EmailProcessor],
  exports: [QueueService],
})
export class QueueModule {}
