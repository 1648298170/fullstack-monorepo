import { ResultCode, type ResultCodeKey } from "../result/result-code";
import { resolveMessage } from "../result/biz.exception";

/**
 * 生成错误响应示例
 *
 * 直接从 ResultCode 注册表派生 code + message(单一事实来源),
 * 避免各 Controller 重复手写,也避免与注册表不一致。
 *
 * @param key    ResultCode 注册表 key
 * @param params 填充消息模板占位符
 * @param path   请求路径示例
 */
export function errorExample(
  key: ResultCodeKey,
  params?: Record<string, string | number>,
  path = ""
): { code: number; message: string; timestamp: string; path: string } {
  const def = ResultCode[key];
  return {
    code: def.code,
    message: resolveMessage(def.message, params),
    timestamp: "2025-06-20T08:00:00.000Z",
    path,
  };
}

/**
 * 无返回数据的成功响应示例(删除类接口)
 * 结构:{ code: 200, message: 'success', data: null }
 */
export const NO_DATA_SUCCESS_EXAMPLE = {
  code: ResultCode.SUCCESS.code,
  message: ResultCode.SUCCESS.message,
  data: null,
};
