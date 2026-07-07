import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 更新用户 DTO
 * 所有字段可选，仅更新传入的字段
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: "昵称", example: "李四" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nickname?: string;

  @ApiPropertyOptional({ description: "密码", example: "newpassword" })
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password?: string;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
