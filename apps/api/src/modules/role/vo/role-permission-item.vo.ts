import { ApiProperty } from "@nestjs/swagger";
import { PermissionBriefVo } from "./permission-brief.vo";

/**
 * 角色-权限关联项 VO
 */
export class RolePermissionItemVo {
  @ApiProperty({
    description: "权限 ID（关联的目标权限）",
    example: "1900000000000000010",
  })
  permissionId: string;

  @ApiProperty({
    description: "权限详情",
    type: () => PermissionBriefVo,
  })
  permission: PermissionBriefVo;
}
