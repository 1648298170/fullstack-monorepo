import { Global, Module } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";

/**
 * 全局守卫模块
 *
 * 将 AuthGuard 和 RolesGuard 注册为全局守卫，
 * 所有接口默认受认证保护，无需在每个 Controller 中手动声明 @UseGuards()。
 *
 * 守卫执行顺序（NestJS 按注册顺序依次执行）:
 * 1. AuthGuard — 校验用户身份（未标记 @Public 的接口必须认证）
 * 2. RolesGuard — 校验用户角色（标记了 @Roles 的接口需要对应角色）
 *
 * 使用装饰器控制行为:
 * - @Public() — 标记接口跳过认证（如登录、注册、健康检查）
 * - @Roles('admin') — 标记接口所需角色（如管理后台）
 */
@Global()
@Module({
  providers: [
    {
      provide: AuthGuard,
      useClass: AuthGuard,
    },
    {
      provide: RolesGuard,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthGuard, RolesGuard],
})
export class GuardsModule {}
