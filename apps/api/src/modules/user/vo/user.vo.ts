import { ApiProperty } from "@nestjs/swagger";
import { UserRoleItemVo } from "./user-role-item.vo";

/**
 * 用户响应 VO
 *
 * 描述用户详情 / 列表项的响应结构，供 @ApiResponse 使用。
 * 字段对应 UserService 返回的 Prisma select 投影。
 */
export class UserVo {
  @ApiProperty({
    description: "用户 ID（雪花 ID）",
    example: "1900000000000000001",
  })
  id: string;

  @ApiProperty({ description: "用户名", example: "zhangsan" })
  username: string;

  @ApiProperty({ description: "昵称", example: "张三" })
  nickname: string;

  @ApiProperty({
    description: "角色编码（逗号分隔，兼容旧逻辑）",
    example: "admin",
  })
  roles: string;

  @ApiProperty({ description: "是否启用", example: true })
  isActive: boolean;

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
    description: "用户角色列表（明细）",
    type: () => [UserRoleItemVo],
  })
  userRoles: UserRoleItemVo[];
}
