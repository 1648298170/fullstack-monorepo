import { ApiProperty } from "@nestjs/swagger";
import { RoleBriefVo } from "./role-brief.vo";

/**
 * 用户-角色关联项 VO
 */
export class UserRoleItemVo {
  @ApiProperty({
    description: "角色 ID（关联的目标角色）",
    example: "1900000000000000001",
  })
  roleId: string;

  @ApiProperty({
    description: "角色详情",
    type: () => RoleBriefVo,
  })
  role: RoleBriefVo;
}
