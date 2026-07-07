import { ApiProperty } from "@nestjs/swagger";

/**
 * 滑块挑战参数响应 VO
 *
 * 对应 CaptchaService.createSliderChallenge 的返回结构。
 */
export class SliderChallengeVo {
  @ApiProperty({
    description: "验证码 ID，提交校验时原样带回",
    example: "cpt_8b2c0f9e-1c2d-4b5a-9c7d-123456789abc",
  })
  captchaId: string;

  @ApiProperty({
    description: "滑块轨道宽度，前端用于计算拖动范围",
    example: 320,
  })
  width: number;

  @ApiProperty({ description: "滑块纵向位置", example: 86 })
  y: number;

  @ApiProperty({
    description: "验证码有效期，单位秒",
    example: 120,
  })
  expiresIn: number;
}
