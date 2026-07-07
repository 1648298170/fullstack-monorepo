/**
 * 队列常量定义
 *
 * 集中管理所有队列名称，避免硬编码字符串导致的拼写错误。
 * 新增队列时只需在此处添加常量，并在 queue.module.ts 中注册即可。
 */

/** 队列名称常量 */
export const QUEUE_NAMES = {
  /** 邮件发送队列 */
  EMAIL: "email",
  /** 通知推送队列（预留） */
  NOTIFICATION: "notification",
} as const;

/**
 * 队列名称类型（用于类型推导）
 *
 * @public 预留类型工具，队列扩展时用于类型约束
 */
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
