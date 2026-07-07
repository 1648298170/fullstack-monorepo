import { ApiProperty } from "@nestjs/swagger";

/**
 * 菜单响应 VO
 *
 * 描述菜单详情 / 平铺列表项的响应结构，字段对应 SysMenu 模型（不含软删除字段）。
 */
export class MenuVo {
  @ApiProperty({
    description: "菜单 ID",
    example: "1900000000000000020",
  })
  id: string;

  @ApiProperty({ description: "菜单名称", example: "用户管理" })
  name: string;

  @ApiProperty({
    description: "路由路径，如 /system/user",
    example: "/system/user",
    nullable: true,
  })
  path: string | null;

  @ApiProperty({
    description: "前端组件路径，如 system/user/index",
    example: "system/user/index",
    nullable: true,
  })
  component: string | null;

  @ApiProperty({
    description: "父菜单 ID，0 表示顶级",
    example: "0",
  })
  parentId: string;

  @ApiProperty({
    description: "菜单类型: 1=目录 2=菜单 3=按钮",
    example: 2,
  })
  type: number;

  @ApiProperty({
    description: "图标名称",
    example: "user",
    nullable: true,
  })
  icon: string | null;

  @ApiProperty({
    description: "排序序号（越小越靠前）",
    example: 1,
  })
  sort: number;

  @ApiProperty({
    description: "创建时间（ISO 8601）",
    example: "2025-06-20T08:00:00.000Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "更新时间（ISO 8601）",
    example: "2025-06-20T08:00:00.000Z",
  })
  updatedAt: Date;
}
