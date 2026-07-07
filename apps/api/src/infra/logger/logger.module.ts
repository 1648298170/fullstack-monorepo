import { Global, Module } from "@nestjs/common";
import { AppLogger } from "./app-logger";

/**
 * 全局日志模块
 *
 * 将 AppLogger 注册为全局 Provider，任意模块均可注入使用：
 *
 * 方式一 — 直接注入 AppLogger（推荐，类型安全）:
 *   constructor(private readonly logger: AppLogger) {}
 *   this.logger.log('操作成功');
 *
 * 方式二 — 通过 NestJS 内置 Logger（已自动桥接）:
 *   private readonly logger = new Logger(MyService.name);
 *   this.logger.log('操作成功');
 */
@Global()
@Module({
  providers: [
    {
      provide: AppLogger,
      useFactory: () => {
        // 创建无上下文的根日志器实例
        return new AppLogger();
      },
    },
  ],
  exports: [AppLogger],
})
export class LoggerModule {}
