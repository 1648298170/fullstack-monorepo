import { IsString, IsOptional, IsInt, Min, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 更新菜单 DTO
 */
export class UpdateMenuDto {
  @ApiPropertyOptional({ description: "菜单名称", example: "用户管理" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiPropertyOptional({ description: "路由路径", example: "/system/user" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  path?: string;

  @ApiPropertyOptional({
    description: "前端组件路径",
    example: "system/user/index",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  component?: string;

  @ApiPropertyOptional({ description: "父菜单 ID" })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: "菜单类型: 1=目录 2=菜单 3=按钮" })
  @IsOptional()
  @IsInt()
  @Min(1)
  type?: number;

  @ApiPropertyOptional({ description: "图标名称" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: "排序序号" })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
