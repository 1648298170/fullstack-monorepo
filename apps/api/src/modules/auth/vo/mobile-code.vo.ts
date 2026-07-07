import { ApiProperty } from "@nestjs/swagger";

/**
 * 手机号验证码响应对象。
 */
export class MobileCodeVo {
  /** 手机号。 */
  @ApiProperty({
    description: "手机号",
    example: "13800138000",
  })
  mobile: string;

  /** 验证码有效期，单位秒。 */
  @ApiProperty({
    description: "验证码有效期，单位秒",
    example: 300,
  })
  expiresIn: number;

  /** 本地 Mock 短信验证码，正式接入第三方短信后应移除。 */
  @ApiProperty({
    description: "本地 Mock 短信验证码",
    example: "123456",
  })
  mockCode: string;
}
