import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Request } from "express";

/**
 * 用户信息接口
 * 定义 request.user 中应包含的最小字段集合
 * 集成实际认证系统后，扩展此接口以匹配用户模型
 */
interface AuthenticatedUser {
  id: string;
  roles: string[];
}

/**
 * 角色守卫（RolesGuard）
 *
 * 职责: 校验当前用户是否具备访问接口所需的角色。
 * 必须在 AuthGuard 之后执行（依赖 request.user 已被填充）。
 *
 * 工作流程:
 * 1. 读取接口上 @Roles() 装饰器指定的角色列表
 * 2. 如果未标记 @Roles()，直接放行（不进行角色校验）
 * 3. 对比用户角色与接口所需角色，存在任一匹配即放行
 * 4. 无匹配角色 → 返回 403 Forbidden
 *
 * 使用示例:
 *   // 在 Controller 中搭配使用
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles('admin')
 *   @Delete('users/:id')
 *   remove(@Param('id') id: string) { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 读取接口所需的角色列表
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 未标记 @Roles() → 不进行角色校验，直接放行
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    // 无用户信息（理论上不应出现，AuthGuard 应已拦截）
    if (!user) {
      this.logger.warn(
        `角色校验失败: request.user 不存在 — ${request.method} ${request.url}`
      );
      throw new ForbiddenException("无权访问此资源");
    }

    // 检查用户角色是否匹配任一所需角色
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      this.logger.warn(
        `角色不足: 用户 ${String(user.id)} 持有 [${(user.roles ?? []).join(", ")}]，需要 [${requiredRoles.join(", ")}] — ${request.method} ${request.url}`
      );
      throw new ForbiddenException("权限不足，无法访问此资源");
    }

    return true;
  }
}
