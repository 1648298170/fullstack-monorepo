import { ConsoleLogger, type LogLevel } from "@nestjs/common";

/**
 * 应用自定义日志器
 * 继承 NestJS 内置 ConsoleLogger，扩展以下能力：
 *
 * 1. 根据环境自动切换日志级别（开发: verbose，生产: warn）
 * 2. 生产环境输出 JSON 结构化日志（方便 ELK / Datadog 采集）
 * 3. 开发环境输出可读的彩色文本（方便调试）
 * 4. 统一时间戳格式（ISO 8601）
 *
 * 使用方式:
 *   constructor(private readonly logger: AppLogger) {}
 *   this.logger.log('操作成功', 'UserService');
 *
 * 或通过 NestJS 内置 Logger（已全局注册为默认日志器）:
 *   private readonly logger = new Logger(MyService.name);
 */
export class AppLogger extends ConsoleLogger {
  /**
   * @param context 日志上下文（通常是类名）
   * @param options 日志选项
   */
  constructor(context?: string, options?: { logLevels?: LogLevel[] }) {
    super(context ?? "Application", options ?? {});
  }

  /**
   * 格式化日志消息
   * - 开发环境: [时间戳] [级别] [上下文] 消息（彩色、可读）
   * - 生产环境: JSON 结构化输出（便于日志采集系统解析）
   */
  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    appName: string,
    contextMessage: string,
    timestampDiff: string
  ): string {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // 生产环境: JSON 结构化日志
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level: logLevel,
        context: this.context ?? "Application",
        message: typeof message === "string" ? message : String(message),
        pid: process.pid,
        app: appName,
      });
    }

    // 开发/测试环境: 可读的文本格式（使用父类默认格式化）
    return super.formatMessage(
      logLevel,
      message,
      pidMessage,
      appName,
      contextMessage,
      timestampDiff
    );
  }
}
