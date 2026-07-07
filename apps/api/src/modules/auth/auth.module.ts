import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { CaptchaModule } from "../captcha/captcha.module";

/**
 * 认证模块
 *
 * 提供 JWT 认证能力，包含:
 * - AuthService: 注册、登录、Token 签发
 * - AuthController: /auth/register 和 /auth/login 接口
 * - JwtStrategy: Passport JWT 策略，自动验证请求中的 Token
 * - JwtModule: JWT 签发/验证服务
 *
 * 使用方式:
 * - 注册: POST /auth/register { username, password }
 * - 登录: POST /auth/login { username, password }
 * - 访问受保护接口: Authorization: Bearer <accessToken>
 */
@Module({
  imports: [
    // Passport 核心（使用默认策略注册）
    PassportModule,
    // JWT 模块（全局注册，JwtService 可在任意注入）
    JwtModule,
    CaptchaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
