import { Module } from "@nestjs/common";
import { RoleService } from "./role.service";
import { RoleController } from "./role.controller";

/**
 * 角色管理模块
 *
 * 提供角色的 CRUD 和权限 / 菜单分配能力。
 */
@Module({
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RoleModule {}
