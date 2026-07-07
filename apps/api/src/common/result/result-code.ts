/**
 * 业务码定义接口
 */
export interface ResultCodeDef {
  /** 业务码(响应体 code 字段) */
  code: number;
  /** 对应 HTTP 状态码(传输层 + Swagger 集成) */
  httpStatus: number;
  /** 默认提示语,支持 {placeholder} 模板,抛错时传参填充 */
  message: string;
}

/**
 * 业务码注册表(单一事实来源)
 *
 * 编号规则:模块前缀 + 顺序号(与 HTTP 状态彻底解耦,避免撞码)
 *   成功     = 200
 *   用户 1xxxx(10001 起)
 *   认证 2xxxx(20001 起)
 *   角色 3xxxx(30001 起)
 *   菜单 4xxxx(40001 起)
 *
 * 同模块可有任意多个相同 httpStatus 的错误,互不冲突。
 * 跨模块复用:同一语义的错误(如「角色不存在」)共用一个 key,不区分抛出位置。
 */
export const ResultCode = {
  // ===== 通用 =====
  SUCCESS: { code: 200, httpStatus: 200, message: "success" },

  // ===== 用户模块 1xxxx =====
  USER_NOT_FOUND: { code: 10001, httpStatus: 404, message: "用户不存在: {id}" },
  USERNAME_EXISTS: {
    code: 10002,
    httpStatus: 409,
    message: '用户名 "{name}" 已存在',
  },

  // ===== 认证模块 2xxxx =====
  BAD_CREDENTIALS: {
    code: 20001,
    httpStatus: 401,
    message: "用户名或密码错误",
  },
  ACCOUNT_DISABLED: {
    code: 20002,
    httpStatus: 403,
    message: "账户已被禁用，请联系管理员",
  },
  CAPTCHA_REQUIRED: {
    code: 20003,
    httpStatus: 400,
    message: "请先完成滑块验证码",
  },
  CAPTCHA_INVALID: {
    code: 20004,
    httpStatus: 400,
    message: "验证码无效或已过期",
  },

  // ===== 角色模块 3xxxx =====
  ROLE_NOT_FOUND: { code: 30001, httpStatus: 404, message: "角色不存在: {id}" },
  ROLE_CODE_EXISTS: {
    code: 30002,
    httpStatus: 409,
    message: '角色编码 "{code}" 已存在',
  },
  PERMISSION_NOT_FOUND: {
    code: 30003,
    httpStatus: 404,
    message: "权限不存在: {id}",
  },

  // ===== 菜单模块 4xxxx =====
  MENU_NOT_FOUND: { code: 40001, httpStatus: 404, message: "菜单不存在: {id}" },
  PARENT_MENU_NOT_FOUND: {
    code: 40002,
    httpStatus: 404,
    message: "父菜单不存在: {id}",
  },
} as const satisfies Record<string, ResultCodeDef>;

/** 所有业务码 key 的联合类型 */
export type ResultCodeKey = keyof typeof ResultCode;
