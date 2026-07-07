import Joi from "joi";

/**
 * 环境变量校验规则
 * 应用启动时会自动校验 .env 文件中的变量格式是否合法
 * 校验失败会阻止启动，避免运行时因配置错误导致异常
 */
export const validationSchema = Joi.object({
  // 运行环境，仅允许 development / production / test
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  // 应用端口，必须为数字
  APP_PORT: Joi.number().default(3000),
  // 应用名称
  APP_NAME: Joi.string().default("nestjs-project"),
  // 数据库连接配置 (MySQL)
  DB_HOST: Joi.string().default("localhost"),
  DB_PORT: Joi.number().default(3306),
  DB_USERNAME: Joi.string().default("root"),
  DB_PASSWORD: Joi.string().allow(""),
  DB_DATABASE: Joi.string().default("nestjs_dev"),
  // 数据库连接 URL (可选，优先于散列变量)
  DATABASE_URL: Joi.string().optional(),
  // JWT 配置
  JWT_SECRET: Joi.string().min(16).default("dev-secret-change-in-production"),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default("7d"),
  // Redis 配置
  REDIS_HOST: Joi.string().default("localhost"),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow(""),
  REDIS_DB: Joi.number().min(0).max(15).default(0),
  // 滑块验证码
  CAPTCHA_ENABLED: Joi.boolean().default(true),
  CAPTCHA_REQUIRED_ALWAYS: Joi.boolean().default(false),
  CAPTCHA_SLIDER_TTL: Joi.number().min(30).max(600).default(120),
  CAPTCHA_TOKEN_TTL: Joi.number().min(30).max(900).default(300),
  CAPTCHA_SLIDER_TOLERANCE: Joi.number().min(1).max(20).default(5),
  CAPTCHA_MIN_DURATION: Joi.number().min(100).max(5000).default(300),
  CAPTCHA_BIND_IP: Joi.boolean().default(false),
  LOGIN_FAIL_CAPTCHA_THRESHOLD_ACCOUNT: Joi.number().min(1).max(20).default(3),
  LOGIN_FAIL_CAPTCHA_THRESHOLD_IP: Joi.number().min(1).max(50).default(5),
  LOGIN_FAIL_TTL: Joi.number().min(60).max(86400).default(900),
  SMS_CODE_TTL: Joi.number().min(60).max(1800).default(300),
  SMS_CODE_RESEND_INTERVAL: Joi.number().min(10).max(300).default(60),
  // 雪花 ID 配置
  SNOWFLAKE_EPOCH: Joi.string().default("2025-01-01"),
  SNOWFLAKE_MACHINE_ID: Joi.number().min(0).max(1023).default(1),
  // 日志级别，仅允许 debug / info / warn / error
  LOG_LEVEL: Joi.string()
    .valid("debug", "info", "warn", "error")
    .default("info"),
});
