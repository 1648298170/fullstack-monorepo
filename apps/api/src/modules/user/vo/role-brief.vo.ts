import { ApiProperty } from "@nestjs/swagger";

/**
 * 角色简要信息 VO
 * 用于用户详情中的 userRoles[].role 嵌套结构
 */
export class RoleBriefVo {
  @ApiProperty({ description: "角色 ID", example: "1900000000000000001" })
  id: string;

  @ApiProperty({ description: "角色名称", example: "管理员" })
  name: string;

  @ApiProperty({ description: "角色编码", example: "admin" })
  code: string;
}
