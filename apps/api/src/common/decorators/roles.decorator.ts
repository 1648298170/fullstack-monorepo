import { SetMetadata } from "@nestjs/common";

/**
 * 角色装饰器元数据的 Key
 * 使用 @Roles() 标记接口所需的角色列表
 */
export const ROLES_KEY = "roles";

/**
 * 角色装饰器
 *
 * 标记某个接口所需的角色列表，RolesGuard 会校验当前用户是否具备其中任一角色。
 * 如果未使用 @Roles() 标记，则不进行角色校验（仅校验认证）。
 *
 * 使用示例:
 *   @Roles('admin')
 *   @Delete('users/:id')
 *   remove(@Param('id') id: string) { ... }
 *
 *   @Roles('admin', 'editor')
 *   @Put('articles/:id')
 *   update(@Param('id') id: string, @Body() dto: UpdateArticleDto) { ... }
 *
 * @public 预留装饰器，业务 controller 接入 @Roles() 后自动消除 unused
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
