import { IsArray, IsNotEmpty, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 分配角色菜单 DTO
 * 传入菜单 ID 数组，全量替换该角色的菜单列表
 */
export class AssignRoleMenusDto {
  @ApiProperty({
    description: "菜单 ID 列表",
    example: ["1", "2", "3"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  menuIds: string[];
}
