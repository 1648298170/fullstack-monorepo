import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 用户登录 DTO
 * 请求体: { username: "admin", password: "123456" }
 */
export class LoginDto {
  @ApiProperty({ description: "用户名", example: "admin" })
  @IsString({ message: "用户名必须为字符串" })
  @IsNotEmpty({ message: "用户名不能为空" })
  @MinLength(3, { message: "用户名至少 3 个字符" })
  @MaxLength(50, { message: "用户名最多 50 个字符" })
  username: string;

  @ApiProperty({ description: "密码", example: "admin123" })
  @IsString({ message: "密码必须为字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  @MinLength(6, { message: "密码至少 6 个字符" })
  @MaxLength(100, { message: "密码最多 100 个字符" })
  password: string;

  @ApiPropertyOptional({
    description: "滑块验证码通过后返回的一次性票据",
    example: "cap_1234567890",
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
