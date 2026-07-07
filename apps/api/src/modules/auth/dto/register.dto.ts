import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 用户注册 DTO
 * 请求体: { username: "newuser", password: "123456", nickname: "昵称" }
 */
export class RegisterDto {
  @ApiProperty({ description: "用户名", example: "newuser" })
  @IsString({ message: "用户名必须为字符串" })
  @IsNotEmpty({ message: "用户名不能为空" })
  @MinLength(3, { message: "用户名至少 3 个字符" })
  @MaxLength(50, { message: "用户名最多 50 个字符" })
  username: string;

  @ApiProperty({ description: "密码", example: "123456" })
  @IsString({ message: "密码必须为字符串" })
  @IsNotEmpty({ message: "密码不能为空" })
  @MinLength(6, { message: "密码至少 6 个字符" })
  @MaxLength(100, { message: "密码最多 100 个字符" })
  password: string;

  @ApiProperty({
    description: "昵称（可选）",
    example: "张三",
    required: false,
  })
  @IsOptional()
  @IsString({ message: "昵称必须为字符串" })
  @MaxLength(100, { message: "昵称最多 100 个字符" })
  nickname?: string;
}
