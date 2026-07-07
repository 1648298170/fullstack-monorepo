import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ResultCode } from "../result/result-code";

/**
 * 统一响应格式接口
 * 所有接口的返回值都遵循此结构
 */
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/**
 * 全局响应拦截器
 * 将 Controller 返回的数据包装为统一的成功响应格式
 *
 * Controller 返回: { id: 1, name: 'test' }
 * 实际响应: { code: 200, data: { id: 1, name: 'test' }, message: 'success' }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data: T) => ({
        code: ResultCode.SUCCESS.code,
        data,
        message: ResultCode.SUCCESS.message,
      }))
    );
  }
}
