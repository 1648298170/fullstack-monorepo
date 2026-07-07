import { ApiProperty } from "@nestjs/swagger";

/**
 * 菜单简要信息 VO
 * 用于角色详情中的 roleMenus[].menu 嵌套结构
 */
export class MenuBriefVo {
  @ApiProperty({ description: "菜单 ID", example: "1900000000000000020" })
  id: string;

  @ApiProperty({ description: "菜单名称", example: "用户管理" })
  name: string;

  @ApiProperty({
    description: "路由路径",
    example: "/system/user",
    nullable: true,
  })
  path: string | null;
}
