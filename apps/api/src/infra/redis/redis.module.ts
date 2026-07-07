import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/**
 * 全局 Redis 模块
 *
 * 将 RedisService 注册为全局 Provider，任意模块均可注入使用：
 *
 *   constructor(private readonly redisService: RedisService) {}
 *
 *   // 缓存用户信息 1 小时
 *   await this.redisService.set('user:1', JSON.stringify(user), 'EX', 3600);
 *
 *   // 读取缓存
 *   const cached = await this.redisService.get('user:1');
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
