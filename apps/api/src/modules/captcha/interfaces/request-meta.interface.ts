/** 与验证码绑定的请求侧信息，用于降低 token 被复制后重放的风险。 */
export interface RequestMeta {
  /** 请求来源 IP；默认不强绑定，可通过 CAPTCHA_BIND_IP 开启。 */
  ip: string;
  /** User-Agent 原文不会入库，服务层会保存 hash。 */
  userAgent: string;
}
