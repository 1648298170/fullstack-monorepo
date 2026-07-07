import { Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { type Queue } from "bullmq";
import { QUEUE_NAMES } from "./queue.constants";

/**
 * 队列服务
 *
 * 封装 BullMQ 队列操作，提供统一的任务添加入口。
 * 使用方式:
 *
 *   constructor(private readonly queueService: QueueService) {}
 *
 *   // 添加邮件发送任务
 *   await this.queueService.addEmailJob({
 *     to: 'user@example.com',
 *     subject: '欢迎注册',
 *     body: '<h1>你好</h1>',
 *   });
 */
@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    // 通过 @InjectQueue 注入指定名称的队列实例
    @InjectQueue(QUEUE_NAMES.EMAIL)
    private readonly emailQueue: Queue
  ) {}

  /**
   * 添加邮件发送任务到队列
   * @param data - 邮件内容 { to, subject, body }
   * @returns 任务 ID
   */
  async addEmailJob(data: {
    to: string;
    subject: string;
    body: string;
  }): Promise<string | undefined> {
    const job = await this.emailQueue.add("send", data, {
      // 失败重试次数
      attempts: 3,
      // 指数退避策略：首次 1s，后续递增
      backoff: { type: "exponential", delay: 1000 },
      // 完成后自动移除（节省 Redis 内存）
      removeOnComplete: true,
      // 失败后保留记录（便于排查问题）
      removeOnFail: false,
    });

    this.logger.log(
      `邮件任务已加入队列，任务ID: ${job.id}，收件人: ${data.to}`
    );

    return job.id;
  }

  /**
   * 获取原生 BullMQ Queue 实例
   * 用于高级操作（批量添加、暂停/恢复队列、获取任务列表等）
   */
  getEmailQueue(): Queue {
    return this.emailQueue;
  }
}
