import { IsArray, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 分配角色权限 DTO
 * 传入权限 ID 数组，全量替换该角色的权限列表
 */
export class AssignRolePermissionsDto {
  @ApiProperty({
    description: "权限 ID 列表",
    example: ["1", "2", "3"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissionIds: string[];
}
