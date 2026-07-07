import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

/**
 * 全局 Prisma 模块
 * 使用 @Global() 装饰器，注册后所有模块均可注入 PrismaService，无需重复导入
 *
 * 使用方式:
 *   constructor(private readonly prisma: PrismaService) {}
 *   // 然后 this.prisma.user.findMany() 等
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
