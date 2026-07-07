import { IsArray, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * 分配用户角色 DTO
 * 全量替换该用户的角色列表
 */
export class AssignUserRolesDto {
  @ApiProperty({
    description: "角色 ID 列表（全量替换用户已有角色）",
    example: ["1900000000000000001", "1900000000000000002"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roleIds: string[];
}
