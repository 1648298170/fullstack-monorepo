import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BizException } from "../../common/result/biz.exception";
import { MenuService } from "./menu.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";

describe("MenuService", () => {
  let service: MenuService;
  let prisma: {
    sysMenu: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let snowflakeId: { genString: ReturnType<typeof vi.fn> };

  const mockMenu = {
    id: "menu-001",
    name: "系统管理",
    path: "/system",
    component: null,
    parentId: "0",
    type: 1,
    icon: "Setting",
    sort: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockChildMenu = {
    id: "menu-002",
    name: "用户管理",
    path: "/system/user",
    component: "system/user/index",
    parentId: "menu-001",
    type: 2,
    icon: "User",
    sort: 1,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      sysMenu: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };

    snowflakeId = { genString: vi.fn().mockReturnValue("snowflake-menu-001") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: PrismaService, useValue: prisma },
        { provide: SnowflakeIdService, useValue: snowflakeId },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==================== findAll ====================

  describe("findAll", () => {
    it("应返回所有菜单（平铺）", async () => {
      prisma.sysMenu.findMany.mockResolvedValue([mockMenu, mockChildMenu]);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  // ==================== findTree ====================

  describe("findTree", () => {
    it("应构建正确的树形结构", async () => {
      prisma.sysMenu.findMany.mockResolvedValue([mockMenu, mockChildMenu]);

      const tree = await service.findTree();

      // 顶级节点 1 个
      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("系统管理");
      // 子节点 1 个
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe("用户管理");
    });

    it("空菜单应返回空数组", async () => {
      prisma.sysMenu.findMany.mockResolvedValue([]);

      const tree = await service.findTree();

      expect(tree).toHaveLength(0);
    });

    it("parentId 指向不存在菜单时应作为顶级节点", async () => {
      const orphanMenu = {
        ...mockChildMenu,
        parentId: "non-existent-parent",
      };
      prisma.sysMenu.findMany.mockResolvedValue([orphanMenu]);

      const tree = await service.findTree();

      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("用户管理");
    });
  });

  // ==================== findOne ====================

  describe("findOne", () => {
    it("应返回菜单详情", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(mockMenu);

      const result = await service.findOne("menu-001");

      expect(result.name).toBe("系统管理");
    });

    it("菜单不存在时应抛出 BizException", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(null);

      await expect(service.findOne("not-exist")).rejects.toThrow(BizException);
    });

    it("已软删除菜单应抛出 BizException", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue({
        ...mockMenu,
        deletedAt: new Date(),
      });

      await expect(service.findOne("menu-001")).rejects.toThrow(BizException);
    });
  });

  // ==================== create ====================

  describe("create", () => {
    it("应成功创建顶级菜单", async () => {
      prisma.sysMenu.create.mockResolvedValue(mockMenu);

      const result = await service.create({
        name: "系统管理",
        path: "/system",
        type: 1,
        icon: "Setting",
      });

      expect(prisma.sysMenu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "snowflake-menu-001",
            parentId: "0",
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("应成功创建子菜单（校验父菜单存在）", async () => {
      prisma.sysMenu.findFirst.mockResolvedValue(mockMenu); // 父菜单存在
      prisma.sysMenu.create.mockResolvedValue(mockChildMenu);

      const result = await service.create({
        name: "用户管理",
        path: "/system/user",
        component: "system/user/index",
        parentId: "menu-001",
        type: 2,
      });

      expect(prisma.sysMenu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentId: "menu-001" }),
        })
      );
      expect(result).toBeDefined();
    });

    it("父菜单不存在时应抛出 BizException", async () => {
      prisma.sysMenu.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          name: "用户管理",
          type: 2,
          parentId: "not-exist",
        })
      ).rejects.toThrow(BizException);
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("应成功更新菜单", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(mockMenu);
      prisma.sysMenu.update.mockResolvedValue({
        ...mockMenu,
        name: "系统设置",
      });

      const result = await service.update("menu-001", { name: "系统设置" });

      expect(prisma.sysMenu.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { name: "系统设置" },
        })
      );
      expect(result).toBeDefined();
    });
  });

  // ==================== remove ====================

  describe("remove", () => {
    it("应成功软删除菜单", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(mockMenu);
      prisma.sysMenu.update.mockResolvedValue({
        ...mockMenu,
        deletedAt: new Date(),
      });

      await service.remove("menu-001");

      expect(prisma.sysMenu.update).toHaveBeenCalledWith({
        where: { id: "menu-001" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("菜单不存在时应抛出 BizException", async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(null);

      await expect(service.remove("not-exist")).rejects.toThrow(BizException);
    });
  });
});
