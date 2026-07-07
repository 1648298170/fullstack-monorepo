import { SetMetadata } from "@nestjs/common";

/**
 * 公开接口装饰器元数据的 Key
 * 使用 @Public() 标记的接口将跳过 AuthGuard 认证检查
 */
export const IS_PUBLIC_KEY = "isPublic";

/**
 * 公开接口装饰器
 *
 * 标记某个接口为"公开可访问"，跳过 AuthGuard 的认证检查。
 * 默认所有接口都需要认证，只有标记了 @Public() 的才允许匿名访问。
 *
 * 使用示例:
 *   @Public()
 *   @Post('login')
 *   login(@Body() dto: LoginDto) { ... }
 *
 *   @Public()
 *   @Get('health')
 *   check() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
