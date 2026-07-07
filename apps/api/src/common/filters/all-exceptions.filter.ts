import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  type LoggerService,
} from "@nestjs/common";
import { Request, Response } from "express";
import { toZonedISO } from "../time/timezone";

/**
 * 全局异常过滤器
 * 捕获所有未处理的异常，统一返回标准格式的错误响应
 *
 * 响应格式:
 * {
 *   code: number,      // 业务码(BizException) 或 HTTP 状态码(其他异常)
 *   message: string,   // 错误信息
 *   timestamp: string, // ISO 时间戳
 *   path: string       // 请求路径
 * }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger: LoggerService;

  /**
   * @param logger 日志服务实例（可选，默认使用内置 Logger）
   * 注入自定义 AppLogger 后，异常日志会自动走结构化输出
   */
  constructor(logger?: LoggerService) {
    this.logger = logger ?? new Logger(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // 判断是否为 HTTP 异常，取对应状态码；否则返回 500
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // 提取业务码与错误信息：
    //   BizException 的 response 形如 { code, message } → 用业务码
    //   其他 HttpException / 原生异常 → 回退到 HTTP 状态码作为 code
    let code: number = status;
    let message: string;
    if (exception instanceof HttpException) {
      const resp = exception.getResponse();
      if (
        typeof resp === "object" &&
        resp !== null &&
        typeof (resp as { code?: unknown }).code === "number"
      ) {
        const obj = resp as { code: number; message: unknown };
        code = obj.code;
        message = String(obj.message);
      } else {
        message = exception.message;
      }
    } else {
      message = "服务器内部错误";
    }

    // 记录错误日志（4xx 记录 warn 级别，5xx 记录 error 级别并附带堆栈）
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : undefined,
        AllExceptionsFilter.name
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
        AllExceptionsFilter.name
      );
    }

    response.status(status).json({
      code,
      message,
      timestamp: toZonedISO(new Date()),
      path: request.url,
    });
  }
}
