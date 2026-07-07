import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";

/**
 * 手机号验证码注册 DTO。
 */
export class MobileRegisterDto {
  /** 手机号。 */
  @ApiProperty({
    description: "手机号",
    example: "13800138000",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "手机号格式不正确" })
  mobile: string;

  /** 6 位短信验证码。 */
  @ApiProperty({
    description: "短信验证码",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: "验证码必须是 6 位数字" })
  code: string;

  /** 昵称，不传时使用脱敏手机号。 */
  @ApiProperty({
    description: "昵称",
    example: "张三",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;
}
