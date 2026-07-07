import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * 创建菜单 DTO
 */
export class CreateMenuDto {
  @ApiProperty({ description: "菜单名称", example: "用户管理" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

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

  @ApiPropertyOptional({ description: "父菜单 ID，0 表示顶级", default: "0" })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: "菜单类型: 1=目录 2=菜单 3=按钮", example: 1 })
  @IsInt()
  @Min(1)
  type: number;

  @ApiPropertyOptional({ description: "图标名称", example: "User" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @ApiPropertyOptional({ description: "排序序号（越小越靠前）", default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;
}
