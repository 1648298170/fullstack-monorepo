import { Test, type TestingModule } from "@nestjs/testing";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { BizException } from "../../common/result/biz.exception";
import { UserService } from "./user.service";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";

describe("UserService", () => {
  let service: UserService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    sysRole: { findMany: ReturnType<typeof vi.fn> };
    sysUserRole: {
      deleteMany: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let snowflakeId: { genString: ReturnType<typeof vi.fn> };

  // 模拟用户数据
  const mockUser = {
    id: "1234567890",
    username: "testuser",
    password: "hashed_password",
    nickname: "测试用户",
    roles: "user",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    userRoles: [],
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      sysRole: { findMany: vi.fn() },
      sysUserRole: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn((fns) =>
        Array.isArray(fns)
          ? Promise.all(fns)
          : typeof fns === "function"
            ? fns()
            : Promise.resolve()
      ),
    };

    snowflakeId = { genString: vi.fn().mockReturnValue("snowflake-id-001") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: SnowflakeIdService, useValue: snowflakeId },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ==================== findAll ====================

  describe("findAll", () => {
    it("应返回分页用户列表", async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it("支持关键词搜索", async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      await service.findAll({ keyword: "test", page: 1, pageSize: 10 });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [
              { username: { contains: "test" } },
              { nickname: { contains: "test" } },
            ],
          },
        })
      );
    });
  });

  // ==================== findOne ====================

  describe("findOne", () => {
    it("应返回用户详情", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });

      const result = await service.findOne("1234567890");

      expect(result.id).toBe("1234567890");
      expect(result.username).toBe("testuser");
    });

    it("用户不存在时应抛出 BizException", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne("not-exist")).rejects.toThrow(BizException);
    });

    it("已软删除用户应抛出 BizException", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await expect(service.findOne("1234567890")).rejects.toThrow(BizException);
    });
  });

  // ==================== create ====================

  describe("create", () => {
    it("应成功创建用户", async () => {
      // findFirst: 检查用户名唯一性 → null（不存在）
      // findUnique: findOne 内部查询 → 返回完整用户
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        username: "testuser",
        password: "123456",
        nickname: "测试用户",
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "snowflake-id-001",
            username: "testuser",
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("用户名已存在时应抛出 BizException", async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.create({ username: "testuser", password: "123456" })
      ).rejects.toThrow(BizException);
    });
  });

  // ==================== update ====================

  describe("update", () => {
    it("应成功更新用户昵称", async () => {
      // findOne 先通过
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });
      prisma.user.update.mockResolvedValue({ ...mockUser, nickname: "新昵称" });

      const result = await service.update("1234567890", { nickname: "新昵称" });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nickname: "新昵称" },
        })
      );
      expect(result).toBeDefined();
    });

    it("用户不存在时应抛出 BizException", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.update("not-exist", { nickname: "test" })
      ).rejects.toThrow(BizException);
    });
  });

  // ==================== remove ====================

  describe("remove", () => {
    it("应成功软删除用户", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      await service.remove("1234567890");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "1234567890" },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it("用户不存在时应抛出 BizException", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove("not-exist")).rejects.toThrow(BizException);
    });
  });

  // ==================== assignRoles ====================

  describe("assignRoles", () => {
    it("应成功分配角色", async () => {
      const roles = [
        { id: "role-1", code: "admin", name: "管理员" },
        { id: "role-2", code: "editor", name: "编辑者" },
      ];

      // findOne 先通过
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });
      prisma.sysRole.findMany.mockResolvedValue(roles);
      prisma.user.update.mockResolvedValue(mockUser);

      await service.assignRoles("1234567890", ["role-1", "role-2"]);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { roles: "admin,editor" },
        })
      );
    });

    it("角色不存在时应抛出 BizException", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, userRoles: [] });
      prisma.sysRole.findMany.mockResolvedValue([
        { id: "role-1", code: "admin", name: "管理员" },
      ]);

      await expect(
        service.assignRoles("1234567890", ["role-1", "role-not-exist"])
      ).rejects.toThrow(BizException);
    });
  });
});
