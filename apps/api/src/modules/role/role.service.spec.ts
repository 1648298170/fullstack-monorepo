import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BizException } from "../../common/result/biz.exception";
import { RoleService } from "./role.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";

describe("RoleService", () => {
  let service: RoleService;
  let prisma: {
    sysRole: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    sysPermission: { findMany: ReturnType<typeof vi.fn> };
    sysMenu: { findMany: ReturnType<typeof vi.fn> };
    sysRolePermission: {
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    sysRoleMenu: {
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let snowflakeId: { genString: ReturnType<typeof vi.fn> };

  const mockRole = {
    id: "role-001",
    name: "管理员",
    code: "admin",
    description: "系统管理员",
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rolePermissions: [],
    roleMenus: [],
  };

  beforeEach(async () => {
    prisma = {
      sysRole: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sysPermission: { findMany: vi.fn() },
      sysMenu: { findMany: vi.fn() },
      sysRolePermission: { deleteMany: vi.fn(), createMany: vi.fn() },
      sysRoleMenu: { deleteMany: vi.fn(), createMany: vi.fn() },
      $transaction: vi.fn((fns) =>
        Array.isArray(fns)
          ? Promise.all(fns)
          : typeof fns === "function"
            ? fns()
            : Promise.resolve()
      ),
    };

    snowflakeId = { genString: vi.fn().mockReturnValue("snowflake-role-001") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleService,
        { provide: PrismaService, useValue: prisma },
        { provide: SnowflakeIdService, useValue: snowflakeId },
      ],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==================== findAll ====================

  describe("findAll", () => {
    it("应返回角色列表", async () => {
      prisma.sysRole.findMany.mockResolvedValue([mockRole]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].code).toBe("admin");
    });
  });

  // ==================== findOne ====================

  describe("findOne", () => {
    it("应返回角色详情", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(mockRole);

      const result = await service.findOne("role-001");

      expect(result.code).toBe("admin");
    });

    it("角色不存在时应抛出 BizException", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(null);

      await expect(service.findOne("not-exist")).rejects.toThrow(BizException);
    });

    it("已软删除角色应抛出 BizException", async () => {
      prisma.sysRole.findUnique.mockResolvedValue({
        ...mockRole,
        deletedAt: new Date(),
      });

      await expect(service.findOne("role-001")).rejects.toThrow(BizException);
    });
  });

  // ==================== create ====================

  describe("create", () => {
    it("应成功创建角色", async () => {
      prisma.sysRole.findFirst.mockResolvedValue(null); // code 唯一检查
      prisma.sysRole.create.mockResolvedValue(mockRole);
      prisma.sysRole.findUnique.mockResolvedValue(mockRole); // findOne

      const result = await service.create({
        name: "管理员",
        code: "admin",
        description: "系统管理员",
      });

      expect(prisma.sysRole.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: "snowflake-role-001" }),
        })
      );
      expect(result).toBeDefined();
    });

    it("角色编码已存在时应抛出 BizException", async () => {
      prisma.sysRole.findFirst.mockResolvedValue(mockRole);

      await expect(
        service.create({ name: "管理员", code: "admin" })
      ).rejects.toThrow(BizException);
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("应成功更新角色", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysRole.update.mockResolvedValue({
        ...mockRole,
        name: "超级管理员",
      });

      const result = await service.update("role-001", {
        name: "超级管理员",
      });

      expect(prisma.sysRole.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "超级管理员" },
        })
      );
      expect(result).toBeDefined();
    });
  });

  // ==================== remove ====================

  describe("remove", () => {
    it("应成功软删除角色", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysRole.update.mockResolvedValue({
        ...mockRole,
        deletedAt: new Date(),
      });

      await service.remove("role-001");

      expect(prisma.sysRole.update).toHaveBeenCalledWith({
        where: { id: "role-001" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  // ==================== assignPermissions ====================

  describe("assignPermissions", () => {
    it("应成功分配权限", async () => {
      const permissions = [
        { id: "perm-1", name: "创建用户", code: "user:create", type: "api" },
        { id: "perm-2", name: "删除用户", code: "user:delete", type: "api" },
      ];

      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysPermission.findMany.mockResolvedValue(permissions);

      await service.assignPermissions("role-001", ["perm-1", "perm-2"]);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("权限不存在时应抛出 BizException", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysPermission.findMany.mockResolvedValue([
        { id: "perm-1", name: "创建用户", code: "user:create", type: "api" },
      ]);

      await expect(
        service.assignPermissions("role-001", ["perm-1", "perm-not-exist"])
      ).rejects.toThrow(BizException);
    });
  });

  // ==================== assignMenus ====================

  describe("assignMenus", () => {
    it("应成功分配菜单", async () => {
      const menus = [
        { id: "menu-1", name: "用户管理", path: "/system/user" },
        { id: "menu-2", name: "角色管理", path: "/system/role" },
      ];

      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysMenu.findMany.mockResolvedValue(menus);

      await service.assignMenus("role-001", ["menu-1", "menu-2"]);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("菜单不存在时应抛出 BizException", async () => {
      prisma.sysRole.findUnique.mockResolvedValue(mockRole);
      prisma.sysMenu.findMany.mockResolvedValue([
        { id: "menu-1", name: "用户管理", path: "/system/user" },
      ]);

      await expect(
        service.assignMenus("role-001", ["menu-1", "menu-not-exist"])
      ).rejects.toThrow(BizException);
    });
  });
});
