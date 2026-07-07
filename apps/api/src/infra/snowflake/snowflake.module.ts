import { Global, Module } from "@nestjs/common";
import { SnowflakeIdService } from "./snowflake-id.service";

/**
 * 全局雪花 ID 模块
 *
 * 将 SnowflakeIdService 注册为全局 Provider，任意模块均可注入使用：
 *
 *   constructor(private readonly idService: SnowflakeIdService) {}
 *
 *   const id = this.idService.genString(); // "177297814341029888"
 */
@Global()
@Module({
  providers: [SnowflakeIdService],
  exports: [SnowflakeIdService],
})
export class SnowflakeModule {}
