import { APP_TIMEZONE } from "../common/time/timezone";

/**
 * 配置工厂函数
 * 将环境变量映射为结构化的配置对象，供 ConfigModule 加载使用
 * 优先读取环境变量，未设置时使用默认值
 */
export default () => ({
  // 当前运行环境: development | production | test
  nodeEnv: process.env.NODE_ENV ?? "development",
  // 应用配置
  app: {
    name: process.env.APP_NAME ?? "nestjs-project",
    port: parseInt(process.env.APP_PORT ?? "3000", 10),
    // 项目时区(数据库存储 + 接口响应统一使用此时区,不用 UTC)
    timezone: APP_TIMEZONE,
  },
  // 数据库配置 (MySQL)
  database: {
    host: process.env.DB_HOST ?? "localhost",
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    username: process.env.DB_USERNAME ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_DATABASE ?? "nestjs_dev",
  },
  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET ?? "dev-secret-change-in-production",
    // Access Token 过期时间
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    // Refresh Token 过期时间
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },
  // Redis 配置
  redis: {
    host: process.env.REDIS_HOST ?? "localhost",
    port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    password: process.env.REDIS_PASSWORD ?? "",
    db: parseInt(process.env.REDIS_DB ?? "0", 10),
  },
  captcha: {
    enabled: process.env.CAPTCHA_ENABLED !== "false",
    requiredAlways: process.env.CAPTCHA_REQUIRED_ALWAYS === "true",
    sliderTtl: parseInt(process.env.CAPTCHA_SLIDER_TTL ?? "120", 10),
    tokenTtl: parseInt(process.env.CAPTCHA_TOKEN_TTL ?? "300", 10),
    tolerance: parseInt(process.env.CAPTCHA_SLIDER_TOLERANCE ?? "5", 10),
    minDuration: parseInt(process.env.CAPTCHA_MIN_DURATION ?? "300", 10),
    bindIp: process.env.CAPTCHA_BIND_IP === "true",
  },
  loginSecurity: {
    accountCaptchaThreshold: parseInt(
      process.env.LOGIN_FAIL_CAPTCHA_THRESHOLD_ACCOUNT ?? "3",
      10
    ),
    ipCaptchaThreshold: parseInt(
      process.env.LOGIN_FAIL_CAPTCHA_THRESHOLD_IP ?? "5",
      10
    ),
    failTtl: parseInt(process.env.LOGIN_FAIL_TTL ?? "900", 10),
  },
  sms: {
    codeTtl: parseInt(process.env.SMS_CODE_TTL ?? "300", 10),
    resendInterval: parseInt(process.env.SMS_CODE_RESEND_INTERVAL ?? "60", 10),
  },
  // 雪花 ID 配置
  snowflake: {
    // 纪元起始日期（越近 ID 越短，建议设为项目开始日期）
    epoch: process.env.SNOWFLAKE_EPOCH ?? "2025-01-01",
    // 机器 ID（0-1023，分布式部署时每个实例不同）
    machineId: parseInt(process.env.SNOWFLAKE_MACHINE_ID ?? "1", 10),
  },
  // 日志配置
  log: {
    level: process.env.LOG_LEVEL ?? "info",
  },
});
