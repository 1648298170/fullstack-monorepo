import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";

/**
 * Redis 服务
 *
 * 封装 ioredis 客户端实例，提供统一的 Redis 操作入口。
 * - onModuleDestroy: 应用关闭时自动断开连接
 * - 支持通过 ConfigService 动态配置连接参数
 * - 暴露原生 Redis 客户端，可使用全部 ioredis 方法
 *
 * 使用方式:
 *   constructor(private readonly redisService: RedisService) {}
 *
 *   // 基础操作
 *   await this.redisService.set('key', 'value', 'EX', 3600);
 *   const val = await this.redisService.get('key');
 *
 *   // 哈希
 *   await this.redisService.hset('user:1', 'name', '张三');
 *
 *   // 原生客户端（Pipeline / 事务 / Lua 脚本等高级操作）
 *   const client = this.redisService.getClient();
 *   const pipeline = client.pipeline();
 *   pipeline.set('a', '1');
 *   pipeline.get('a');
 *   const results = await pipeline.exec();
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>("redis.host", "localhost");
    const port = this.configService.get<number>("redis.port", 6379);
    const password = this.configService.get<string>("redis.password", "");
    const db = this.configService.get<number>("redis.db", 0);

    this.client = new Redis({
      host,
      port,
      // 密码为空字符串时不传 password 参数（避免 Redis 报 Client sent AUTH 错误）
      password: password || undefined,
      db,
      // 连接超时（毫秒）
      connectTimeout: 10000,
      // 重试策略：最多重试 10 次，间隔递增
      retryStrategy: (times) => {
        if (times > 10) {
          this.logger.error("Redis 连接重试次数超限，停止重试");
          return null;
        }
        return Math.min(times * 200, 5000);
      },
      // 启用离线队列（断连时缓存命令，重连后自动执行）
      enableOfflineQueue: true,
      // 自动将 BigInt 转为 Number（ioredis 默认返回 string）
      // 使用 this.client.get() 返回 string | null
    });

    // 连接事件监听
    this.client.on("connect", () => {
      this.logger.log(`Redis 连接成功: ${host}:${port}/${db}`);
    });

    this.client.on("error", (err) => {
      this.logger.error(`Redis 连接错误: ${err.message}`);
    });

    this.client.on("close", () => {
      this.logger.warn("Redis 连接已关闭");
    });
  }

  /**
   * 获取原生 ioredis 客户端
   * 用于 Pipeline、事务（multi）、Lua 脚本等高级操作
   */
  getClient(): Redis {
    return this.client;
  }

  // ==================== 常用操作快捷方法 ====================

  /**
   * 设置键值对
   * @param key 键
   * @param value 值
   * @param ttlSeconds 过期时间（秒），不传则永不过期
   */
  async set(
    key: string,
    value: string | number | Buffer,
    ttlSeconds?: number
  ): Promise<string | null> {
    if (ttlSeconds !== undefined) {
      return this.client.set(key, value, "EX", ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /** 获取键值 */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** 删除键（返回被删除的键数量） */
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  /** 检查键是否存在（返回存在的键数量） */
  async exists(...keys: string[]): Promise<number> {
    return this.client.exists(...keys);
  }

  /** 设置键过期时间（秒） */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  /** 获取键剩余过期时间（秒），-1=永不过期，-2=键不存在 */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /** 自增（返回自增后的值） */
  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** 自减（返回自减后的值） */
  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  // ==================== 哈希操作 ====================

  /** 设置哈希字段 */
  async hset(
    key: string,
    field: string,
    value: string | number
  ): Promise<number> {
    return this.client.hset(key, field, value);
  }

  /** 获取哈希字段 */
  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  /** 获取哈希所有字段 */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  /** 删除哈希字段 */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  // ==================== 启动时强制 noeviction(BullMQ 队列安全) ====================

  /**
   * 应用启动时校验并修正 Redis 淘汰策略为 noeviction。
   *
   * 原因:BullMQ 的队列/任务键若被 LRU 淘汰会导致丢任务、队列损坏。
   * 若当前策略非 noeviction,则通过 CONFIG SET 修正;CONFIG 被禁的托管 Redis
   * (如 ElastiCache)会抛错,降级为提示运维手动配置 redis.conf。
   */
  async onModuleInit(): Promise<void> {
    try {
      const res = (await this.client.config(
        "GET",
        "maxmemory-policy"
      )) as unknown[];
      const policy = Array.isArray(res) ? String(res[1]) : String(res);
      if (policy !== "noeviction") {
        await this.client.config("SET", "maxmemory-policy", "noeviction");
        this.logger.warn(
          `Redis maxmemory-policy 已从 "${policy}" 修正为 "noeviction"（BullMQ 队列安全要求，LRU 淘代会丢任务）`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `无法自动设置 Redis maxmemory-policy=noeviction（${msg}）；请手动在 redis.conf 配置 maxmemory-policy noeviction`
      );
    }
  }

  // ==================== 应用关闭时断开连接 ====================

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log("Redis 连接已断开");
  }
}
