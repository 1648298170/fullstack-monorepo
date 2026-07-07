import { ApiProperty } from "@nestjs/swagger";

/**
 * 滑块校验通过后的一次性登录票据 VO
 *
 * 对应 CaptchaService.verifySliderCaptcha 的返回结构。
 */
export class SliderVerifyVo {
  @ApiProperty({
    description: "一次性登录票据，登录时通过 captchaToken 提交",
    example: "cap_8b2c0f9e-1c2d-4b5a-9c7d-123456789abc",
  })
  captchaToken: string;

  @ApiProperty({
    description: "票据有效期，单位秒",
    example: 300,
  })
  expiresIn: number;
}
