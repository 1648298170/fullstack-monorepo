import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { BizException } from "../../common/result/biz.exception";
import { CreateMenuDto } from "./dto/create-menu.dto";
import { UpdateMenuDto } from "./dto/update-menu.dto";

/**
 * 菜单节点类型（含子节点）
 */
export interface MenuNode {
  id: string;
  name: string;
  path: string | null;
  component: string | null;
  parentId: string;
  type: number;
  icon: string | null;
  sort: number;
  createdAt: Date;
  updatedAt: Date;
  children: MenuNode[];
}

/**
 * 菜单服务
 *
 * 提供菜单的 CRUD 操作和树形结构构建：
 * - 查询所有菜单（平铺 / 树形）
 * - 创建 / 更新 / 删除菜单
 * - 自动构建父子树形结构
 */
@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeId: SnowflakeIdService
  ) {}

  /**
   * 查询所有菜单（平铺列表）
   */
  findAll() {
    return this.prisma.sysMenu.findMany({
      where: { deletedAt: null },
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
    });
  }

  /**
   * 查询菜单树形结构
   * 将平铺的菜单列表组装为 parent → children 嵌套结构
   */
  async findTree(): Promise<MenuNode[]> {
    const menus = await this.findAll();

    // 映射为带 children 的节点
    const nodeMap = new Map<string, MenuNode>();
    const roots: MenuNode[] = [];

    for (const menu of menus) {
      nodeMap.set(menu.id, { ...menu, children: [] });
    }

    for (const menu of menus) {
      const node = nodeMap.get(menu.id)!;
      if (menu.parentId === "0" || !nodeMap.has(menu.parentId)) {
        roots.push(node);
      } else {
        nodeMap.get(menu.parentId)!.children.push(node);
      }
    }

    return roots;
  }

  /**
   * 根据 ID 查询菜单详情
   */
  async findOne(id: string) {
    const menu = await this.prisma.sysMenu.findUnique({ where: { id } });

    if (!menu || menu.deletedAt) {
      throw new BizException("MENU_NOT_FOUND", { id });
    }

    return menu;
  }

  /**
   * 创建菜单
   */
  async create(dto: CreateMenuDto) {
    // 校验父菜单是否存在（非顶级菜单时，排除已软删除的）
    if (dto.parentId && dto.parentId !== "0") {
      const parent = await this.prisma.sysMenu.findFirst({
        where: { id: dto.parentId, deletedAt: null },
      });
      if (!parent) {
        throw new BizException("PARENT_MENU_NOT_FOUND", { id: dto.parentId });
      }
    }

    const id = this.snowflakeId.genString();

    const menu = await this.prisma.sysMenu.create({
      data: {
        id,
        name: dto.name,
        path: dto.path,
        component: dto.component,
        parentId: dto.parentId ?? "0",
        type: dto.type,
        icon: dto.icon,
        sort: dto.sort ?? 0,
      },
    });

    this.logger.log(`菜单创建成功: ${menu.name} (ID: ${menu.id})`);
    return menu;
  }

  /**
   * 更新菜单
   */
  async update(id: string, dto: UpdateMenuDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.path !== undefined) data.path = dto.path;
    if (dto.component !== undefined) data.component = dto.component;
    if (dto.parentId !== undefined) data.parentId = dto.parentId;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (dto.sort !== undefined) data.sort = dto.sort;

    await this.prisma.sysMenu.update({ where: { id }, data });

    this.logger.log(`菜单更新成功: ${id}`);
    return this.findOne(id);
  }

  /**
   * 软删除菜单（设置 deletedAt 时间戳）
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.sysMenu.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`菜单软删除成功: ${id}`);
  }
}
