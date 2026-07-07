import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { BizException } from "../../common/result/biz.exception";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { QueryRoleDto } from "./dto/query-role.dto";

/**
 * 角色服务
 *
 * 提供角色的 CRUD 操作和权限 / 菜单分配能力：
 * - 查询角色列表 / 详情
 * - 创建 / 更新 / 删除角色
 * - 分配权限（全量替换）
 * - 分配菜单（全量替换）
 */
@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeId: SnowflakeIdService
  ) {}

  /**
   * 查询所有角色（平铺）
   */
  findAll() {
    return this.prisma.sysRole.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permissionId: true,
            permission: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
        roleMenus: {
          select: {
            menuId: true,
            menu: { select: { id: true, name: true, path: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 分页查询角色列表
   * @returns { list, total, page, pageSize }
   */
  async findPage(query: QueryRoleDto) {
    const { keyword, page = 1, pageSize = 10 } = query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { code: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.sysRole.findMany({
        where,
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          rolePermissions: {
            select: {
              permissionId: true,
              permission: {
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
          roleMenus: {
            select: {
              menuId: true,
              menu: { select: { id: true, name: true, path: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.sysRole.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 根据 ID 查询角色详情
   */
  async findOne(id: string) {
    const role = await this.prisma.sysRole.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permissionId: true,
            permission: {
              select: { id: true, name: true, code: true, type: true },
            },
          },
        },
        roleMenus: {
          select: {
            menuId: true,
            menu: { select: { id: true, name: true, path: true } },
          },
        },
      },
    });

    if (!role || role.deletedAt) {
      throw new BizException("ROLE_NOT_FOUND", { id });
    }

    return role;
  }

  /**
   * 创建角色
   */
  async create(dto: CreateRoleDto) {
    // 检查角色编码唯一性（排除已软删除的角色）
    const existing = await this.prisma.sysRole.findFirst({
      where: { code: dto.code, deletedAt: null },
    });
    if (existing) {
      throw new BizException("ROLE_CODE_EXISTS", { code: dto.code });
    }

    const id = this.snowflakeId.genString();

    const role = await this.prisma.sysRole.create({
      data: {
        id,
        name: dto.name,
        code: dto.code,
        description: dto.description,
      },
    });

    this.logger.log(`角色创建成功: ${role.name} (${role.code})`);
    return this.findOne(role.id);
  }

  /**
   * 更新角色信息
   */
  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    await this.prisma.sysRole.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    this.logger.log(`角色更新成功: ${id}`);
    return this.findOne(id);
  }

  /**
   * 软删除角色（设置 deletedAt 时间戳）
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.sysRole.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`角色软删除成功: ${id}`);
  }

  /**
   * 分配角色权限（全量替换）
   */
  async assignPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);

    // 校验权限是否存在
    const permissions = await this.prisma.sysPermission.findMany({
      where: { id: { in: permissionIds } },
    });
    if (permissions.length !== permissionIds.length) {
      const foundIds = new Set(permissions.map((p) => p.id));
      const missing = permissionIds.filter((pid) => !foundIds.has(pid));
      throw new BizException("PERMISSION_NOT_FOUND", {
        id: missing.join(", "),
      });
    }

    await this.prisma.$transaction([
      this.prisma.sysRolePermission.deleteMany({ where: { roleId } }),
      this.prisma.sysRolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);

    this.logger.log(
      `角色权限分配成功: ${roleId} → [${permissionIds.join(", ")}]`
    );
    return this.findOne(roleId);
  }

  /**
   * 分配角色菜单（全量替换）
   */
  async assignMenus(roleId: string, menuIds: string[]) {
    await this.findOne(roleId);

    // 校验菜单是否存在（排除已软删除的）
    const menus = await this.prisma.sysMenu.findMany({
      where: { id: { in: menuIds }, deletedAt: null },
    });
    if (menus.length !== menuIds.length) {
      const foundIds = new Set(menus.map((m) => m.id));
      const missing = menuIds.filter((mid) => !foundIds.has(mid));
      throw new BizException("MENU_NOT_FOUND", { id: missing.join(", ") });
    }

    await this.prisma.$transaction([
      this.prisma.sysRoleMenu.deleteMany({ where: { roleId } }),
      this.prisma.sysRoleMenu.createMany({
        data: menuIds.map((menuId) => ({ roleId, menuId })),
      }),
    ]);

    this.logger.log(`角色菜单分配成功: ${roleId} → [${menuIds.join(", ")}]`);
    return this.findOne(roleId);
  }
}
