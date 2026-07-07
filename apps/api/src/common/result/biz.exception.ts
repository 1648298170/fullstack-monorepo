import { HttpException } from "@nestjs/common";
import { ResultCode, type ResultCodeKey } from "./result-code";

/**
 * 从消息模板递归提取 {placeholder} 名称
 *   '用户不存在: {id}'           → 'id'
 *   '权限不存在: {id}, 详情 {x}' → 'id' | 'x'
 *   'success'                    → never
 */
type Placeholders<S extends string> =
  S extends `${string}{${infer P}}${infer Rest}`
    ? P | Placeholders<Rest>
    : never;

/**
 * 根据 ResultCode key 派生所需的参数类型(从消息模板自动推断)
 *   USER_NOT_FOUND → { id?: string | number }
 *   BAD_CREDENTIALS → 无占位符,params 可省略
 */
export type ParamsFor<K extends ResultCodeKey> = Partial<
  Record<Placeholders<(typeof ResultCode)[K]["message"]>, string | number>
>;

/** 填充消息模板:{key} → params[key];缺参时保留原占位符便于排查 */
export function resolveMessage(
  template: string,
  params?: Partial<Record<string, string | number>>
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    return v !== undefined ? String(v) : `{${k}}`;
  });
}

/**
 * 业务异常
 *
 * 统一业务错误抛出入口。携带 ResultCode 注册表中的业务码,
 * 由全局 AllExceptionsFilter 识别并翻译为响应体 { code, message }。
 *
 * 用法:
 *   throw new BizException('USER_NOT_FOUND', { id })        // 带参
 *   throw new BizException('BAD_CREDENTIALS')               // 无参
 *
 * 响应:
 *   HTTP 404, body { code: 10001, message: '用户不存在: 123' }
 */
export class BizException<
  K extends ResultCodeKey = ResultCodeKey,
> extends HttpException {
  constructor(key: K, params?: ParamsFor<K>) {
    const def = ResultCode[key];
    super(
      {
        code: def.code,
        message: resolveMessage(def.message, params),
      },
      def.httpStatus
    );
  }
}
