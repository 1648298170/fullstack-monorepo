import { IsOptional, IsString, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 更新角色 DTO
 */
export class UpdateRoleDto {
  @ApiPropertyOptional({ description: "角色名称", example: "超级管理员" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "角色描述" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
