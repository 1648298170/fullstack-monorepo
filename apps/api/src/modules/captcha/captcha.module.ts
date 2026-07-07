import { Module } from "@nestjs/common";

import { CaptchaController } from "./captcha.controller";
import { CaptchaService } from "./captcha.service";

/** 验证码模块：提供滑块挑战、滑块校验和登录票据消费能力。 */
@Module({
  controllers: [CaptchaController],
  providers: [CaptchaService],
  exports: [CaptchaService],
})
export class CaptchaModule {}
