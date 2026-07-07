import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard as PassportAuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { Request } from "express";

/**
 * JWT 认证守卫
 *
 * 基于 Passport 的 JWT 策略实现，替代了原来的骨架 AuthGuard。
 * 继承 @nestjs/passport 的 AuthGuard('jwt')，自动:
 * 1. 从 Authorization: Bearer <token> 提取 JWT
 * 2. 通过 JwtStrategy 验证签名和过期时间
 * 3. 将 JwtStrategy.validate() 返回值挂载到 request.user
 *
 * 扩展行为:
 * - @Public() 标记的接口跳过认证
 * - 未携带 Token 或 Token 无效时返回 401
 */
@Injectable()
export class AuthGuard extends PassportAuthGuard("jwt") {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // 检查接口是否标记了 @Public()，标记则跳过认证
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 委托给 Passport JWT 策略验证
    return super.canActivate(context);
  }

  /**
   * Passport 验证失败时的回调
   * 将原始错误统一转为 UnauthorizedException，避免泄露内部信息
   */
  handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext
  ): TUser {
    if (err || !user) {
      const request = context.switchToHttp().getRequest<Request>();
      this.logger.warn(
        `认证失败: ${request.method} ${request.url} — IP: ${request.ip}`
      );
      throw new UnauthorizedException(err?.message ?? "身份认证失败，请先登录");
    }
    return user;
  }
}
