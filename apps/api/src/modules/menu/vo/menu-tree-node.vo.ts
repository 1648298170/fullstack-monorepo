import { ApiProperty } from "@nestjs/swagger";

/**
 * 菜单树形节点 VO
 *
 * 在菜单平铺字段基础上增加 children 子节点数组，形成递归树形结构。
 * 供 /menus/tree 接口的响应文档使用。
 */
export class MenuTreeNodeVo {
  @ApiProperty({ description: "菜单 ID", example: "1900000000000000020" })
  id: string;

  @ApiProperty({ description: "菜单名称", example: "系统管理" })
  name: string;

  @ApiProperty({
    description: "路由路径，如 /system",
    example: "/system",
    nullable: true,
  })
  path: string | null;

  @ApiProperty({
    description: "前端组件路径",
    example: null,
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
    example: 1,
  })
  type: number;

  @ApiProperty({
    description: "图标名称",
    example: "setting",
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

  @ApiProperty({
    description: "子菜单列表",
    type: () => [MenuTreeNodeVo],
  })
  children: MenuTreeNodeVo[];
}
