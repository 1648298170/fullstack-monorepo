import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 创建角色 DTO
 */
export class CreateRoleDto {
  @ApiProperty({ description: "角色名称", example: "管理员" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: "角色编码", example: "admin" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: "角色描述",
    example: "系统管理员，拥有所有权限",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
