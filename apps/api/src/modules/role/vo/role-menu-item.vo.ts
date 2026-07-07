import { ApiProperty } from "@nestjs/swagger";
import { MenuBriefVo } from "./menu-brief.vo";

/**
 * 角色-菜单关联项 VO
 */
export class RoleMenuItemVo {
  @ApiProperty({
    description: "菜单 ID（关联的目标菜单）",
    example: "1900000000000000020",
  })
  menuId: string;

  @ApiProperty({
    description: "菜单详情",
    type: () => MenuBriefVo,
  })
  menu: MenuBriefVo;
}
