import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";

import { Public } from "../../common/decorators/public.decorator";
import { ResponseVo } from "../../common/swagger/response-vo";
import { VerifySliderCaptchaDto } from "./dto/verify-slider-captcha.dto";
import type { RequestMeta } from "./interfaces/request-meta.interface";
import { CaptchaService } from "./captcha.service";
import { SliderChallengeVo } from "./vo/slider-challenge.vo";
import { SliderVerifyVo } from "./vo/slider-verify.vo";

/**
 * 滑块验证码控制器。
 *
 * 接口保持公开访问，但结果会绑定 User-Agent，必要时也可绑定 IP。
 */
@Public()
@ApiTags("验证码")
@Controller("captcha")
export class CaptchaController {
  constructor(private readonly captchaService: CaptchaService) {}

  /** 创建滑块挑战；真实 x 只保存在 Redis，不返回给前端。 */
  @Get("slider")
  @ApiOperation({ summary: "创建滑块验证码" })
  @ApiOkResponse({
    description: "返回滑块挑战参数",
    type: ResponseVo(SliderChallengeVo),
  })
  createSlider(@Req() req: Request) {
    return this.captchaService.createSliderChallenge(this.getMeta(req));
  }

  /** 校验滑块位置和轨迹，通过后换取一次性登录票据。 */
  @Post("slider/verify")
  @ApiOperation({ summary: "校验滑块验证码并换取一次性登录票据" })
  @ApiOkResponse({
    description: "返回 captchaToken",
    type: ResponseVo(SliderVerifyVo),
  })
  verifySlider(@Body() dto: VerifySliderCaptchaDto, @Req() req: Request) {
    return this.captchaService.verifySliderCaptcha(dto, this.getMeta(req));
  }

  /** 提取参与验证码绑定的请求信息，避免控制器向服务层传入完整 Request。 */
  private getMeta(req: Request): RequestMeta {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? "unknown",
      userAgent: req.headers["user-agent"] ?? "",
    };
  }
}
