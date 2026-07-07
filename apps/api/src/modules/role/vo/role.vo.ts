import { ApiProperty } from "@nestjs/swagger";
import { RolePermissionItemVo } from "./role-permission-item.vo";
import { RoleMenuItemVo } from "./role-menu-item.vo";

/**
 * 角色响应 VO
 *
 * 描述角色详情 / 列表项的响应结构，字段对应 RoleService 返回的 Prisma select 投影。
 */
export class RoleVo {
  @ApiProperty({
    description: "角色 ID",
    example: "1900000000000000001",
  })
  id: string;

  @ApiProperty({ description: "角色名称", example: "管理员" })
  name: string;

  @ApiProperty({ description: "角色编码", example: "admin" })
  code: string;

  @ApiProperty({
    description: "角色描述",
    example: "系统超级管理员",
    nullable: true,
  })
  description: string | null;

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
    description: "角色拥有的权限列表",
    type: () => [RolePermissionItemVo],
  })
  rolePermissions: RolePermissionItemVo[];

  @ApiProperty({
    description: "角色关联的菜单列表",
    type: () => [RoleMenuItemVo],
  })
  roleMenus: RoleMenuItemVo[];
}
