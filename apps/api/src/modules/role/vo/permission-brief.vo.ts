import { ApiProperty } from "@nestjs/swagger";

/**
 * 权限简要信息 VO
 * 用于角色详情中的 rolePermissions[].permission 嵌套结构
 */
export class PermissionBriefVo {
  @ApiProperty({ description: "权限 ID", example: "1900000000000000010" })
  id: string;

  @ApiProperty({ description: "权限名称", example: "创建用户" })
  name: string;

  @ApiProperty({
    description: "权限编码",
    example: "user:create",
  })
  code: string;

  @ApiProperty({
    description: "权限类型: api / button",
    example: "api",
  })
  type: string;
}
