import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { MobileLoginDto } from "./dto/mobile-login.dto";
import { MobileRegisterDto } from "./dto/mobile-register.dto";
import { RegisterDto } from "./dto/register.dto";
import { SendMobileCodeDto } from "./dto/send-mobile-code.dto";
import { MobileCodeVo } from "./vo/mobile-code.vo";
import { TokenResultVo } from "./vo/token-result.vo";
import { ResponseVo } from "../../common/swagger/response-vo";
import { Public } from "../../common/decorators/public.decorator";
import { errorExample } from "../../common/swagger/error-example";

/** 错误响应示例（结构由 errorExample 统一维护，与全局 AllExceptionsFilter 输出一致） */
const CONFLICT_EXAMPLE = errorExample(
  "USERNAME_EXISTS",
  { name: "zhangsan" },
  "/auth/register"
);
const UNAUTHORIZED_EXAMPLE = errorExample(
  "BAD_CREDENTIALS",
  undefined,
  "/auth/login"
);

/**
 * 认证控制器
 * 提供用户注册和登录接口，所有接口标记 @Public() 无需认证
 */
@Public()
@ApiTags("认证")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @ApiOperation({
    summary: "用户注册",
    description: "注册新用户并返回 JWT Token（注册即登录）",
  })
  @ApiCreatedResponse({
    description: "注册成功，返回 Token",
    type: ResponseVo(TokenResultVo),
  })
  @ApiConflictResponse({
    description: "用户名已存在",
    schema: { example: CONFLICT_EXAMPLE },
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "用户登录",
    description: "验证用户名密码并返回 JWT Token",
  })
  @ApiOkResponse({
    description: "登录成功，返回 Token",
    type: ResponseVo(TokenResultVo),
  })
  @ApiUnauthorizedResponse({
    description: "用户名或密码错误 / 账户已被禁用",
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, req);
  }

  /**
   * 发送手机号登录验证码。
   */
  @Post("mobile/code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "发送手机号登录验证码",
    description: "发送 Mock 短信登录验证码前会先消费滑块验证票据。",
  })
  @ApiOkResponse({
    description: "Mock 短信验证码发送成功",
    type: ResponseVo(MobileCodeVo),
  })
  sendMobileCode(@Body() dto: SendMobileCodeDto, @Req() req: Request) {
    return this.authService.sendMobileCode(dto, req);
  }

  /**
   * 发送手机号注册验证码。
   */
  @Post("mobile/register/code")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "发送手机号注册验证码",
    description: "发送 Mock 短信注册验证码前会先消费滑块验证票据。",
  })
  @ApiOkResponse({
    description: "Mock 短信验证码发送成功",
    type: ResponseVo(MobileCodeVo),
  })
  @ApiConflictResponse({
    description: "手机号已注册",
    schema: { example: CONFLICT_EXAMPLE },
  })
  sendMobileRegisterCode(@Body() dto: SendMobileCodeDto, @Req() req: Request) {
    return this.authService.sendMobileRegisterCode(dto, req);
  }

  /**
   * 手机号验证码注册。
   */
  @Post("mobile/register")
  @ApiOperation({
    summary: "手机号验证码注册",
    description: "使用手机号和短信验证码注册用户，注册成功后返回 JWT Token。",
  })
  @ApiCreatedResponse({
    description: "注册成功",
    type: ResponseVo(TokenResultVo),
  })
  @ApiConflictResponse({
    description: "手机号已注册",
    schema: { example: CONFLICT_EXAMPLE },
  })
  mobileRegister(@Body() dto: MobileRegisterDto) {
    return this.authService.mobileRegister(dto);
  }

  /**
   * 手机号验证码登录。
   */
  @Post("mobile/login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "手机号验证码登录",
    description: "已注册用户使用手机号和短信验证码登录。",
  })
  @ApiOkResponse({
    description: "登录成功",
    type: ResponseVo(TokenResultVo),
  })
  @ApiUnauthorizedResponse({
    description: "短信验证码无效 / 账户已被禁用",
    schema: { example: UNAUTHORIZED_EXAMPLE },
  })
  mobileLogin(@Body() dto: MobileLoginDto) {
    return this.authService.mobileLogin(dto);
  }
}
