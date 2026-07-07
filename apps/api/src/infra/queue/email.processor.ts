import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { type Job } from "bullmq";
import { QUEUE_NAMES } from "./queue.constants";

/**
 * 邮件队列处理器
 *
 * 继承 WorkerHost，实现 process 方法处理邮件发送任务。
 * BullMQ 会自动创建 Worker 消费队列中的任务。
 *
 * 支持的事件:
 * - completed: 任务完成
 * - failed: 任务失败
 * - progress: 进度更新
 *
 * 使用方式:
 *   // 在任意 Service 中注入 Queue 后添加任务
 *   constructor(@InjectQueue(QUEUE_NAMES.EMAIL) private emailQueue: Queue) {}
 *   await this.emailQueue.add('send', { to, subject, body });
 */
@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  /**
   * 处理邮件发送任务
   * @param job - BullMQ 任务对象，包含任务数据和元信息
   */
  async process(
    job: Job<{ to: string; subject: string; body: string }>
  ): Promise<{ sent: boolean; timestamp: string }> {
    const { to, subject } = job.data;
    // body 暂未使用，待接入实际邮件服务后使用
    void job.data.body;

    this.logger.log(
      `开始发送邮件 → ${to}，主题: ${subject}，任务ID: ${job.id}`
    );

    // TODO: 接入实际邮件发送服务（如 Nodemailer / AWS SES）
    await job.updateProgress(50);

    // 模拟邮件发送耗时
    await new Promise((resolve) => setTimeout(resolve, 500));

    await job.updateProgress(100);

    this.logger.log(`邮件发送完成 → ${to}`);

    return {
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  /** 任务完成事件 */
  @OnWorkerEvent("completed")
  onCompleted(job: Job): void {
    this.logger.log(`邮件任务完成，任务ID: ${job.id}`);
  }

  /** 任务失败事件 */
  @OnWorkerEvent("failed")
  onFailed(job: Job, error: Error): void {
    this.logger.error(
      `邮件任务失败，任务ID: ${job?.id}，错误: ${error.message}`
    );
  }
}
