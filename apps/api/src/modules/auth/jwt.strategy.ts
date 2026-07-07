import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";

/**
 * JWT Payload 结构（与 AuthService 中签发时一致）
 */
interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
}

/**
 * JWT 认证策略
 *
 * Passport 中间件策略，自动从请求头中提取并验证 JWT：
 * 1. 从 Authorization: Bearer <token> 中提取 Token
 * 2. 验证签名（使用 JWT_SECRET）和过期时间
 * 3. 调用 validate() 方法，将 Payload 转换为 request.user
 *
 * validate() 返回值会自动挂载到 Express 的 request.user 上，
 * 后续的 RolesGuard 和业务代码可以直接使用。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService
  ) {
    super({
      // 从 Authorization: Bearer <token> 中提取 JWT
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 不忽略过期时间（过期 Token 直接拒绝）
      ignoreExpiration: false,
      // JWT 签名密钥（配置中已设默认值，此处断言非 undefined）
      secretOrKey: configService.get<string>("jwt.secret")!,
    });
  }

  /**
   * 验证通过后的回调
   * 将 JWT Payload 转换为完整的用户对象，挂载到 request.user
   *
   * @param payload 解码后的 JWT Payload
   * @returns 挂载到 request.user 的用户对象
   */
  async validate(payload: JwtPayload) {
    // 从数据库获取最新用户信息（确保实时性：角色变更、禁用等）
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException("用户不存在或已被禁用");
    }
    return user;
  }
}
