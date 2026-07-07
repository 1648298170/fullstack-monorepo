import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

/**
 * 发送手机号验证码 DTO。
 */
export class SendMobileCodeDto {
  /** 手机号。 */
  @ApiProperty({
    description: "手机号",
    example: "13800138000",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  mobile: string;

  /** 滑块验证一次性票据，发送验证码前必须消费。 */
  @ApiProperty({
    description: "滑块验证通过后返回的一次性票据",
    example: "cap_8b2c0f9e-1c2d-4b5a-9c7d-123456789abc",
  })
  @IsString()
  @IsNotEmpty()
  captchaToken: string;
}
