import { Module } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { MenuController } from "./menu.controller";

/**
 * 菜单管理模块
 *
 * 提供菜单的 CRUD 和树形结构查询能力。
 */
@Module({
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
