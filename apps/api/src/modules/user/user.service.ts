import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { BizException } from "../../common/result/biz.exception";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import * as bcrypt from "bcryptjs";

/**
 * 用户服务
 *
 * 提供用户的 CRUD 操作和角色分配能力：
 * - 分页查询用户列表（支持关键词搜索）
 * - 创建 / 更新 / 删除用户
 * - 分配角色（全量替换）
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeId: SnowflakeIdService
  ) {}

  /**
   * 分页查询用户列表
   * @returns { list, total, page, pageSize }
   */
  async findAll(query: QueryUserDto) {
    const { keyword, page = 1, pageSize = 10 } = query;

    const where: Record<string, unknown> = { deletedAt: null };
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          roles: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          userRoles: {
            select: {
              roleId: true,
              role: { select: { id: true, name: true, code: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { list, total, page, pageSize };
  }

  /**
   * 根据 ID 查询用户详情
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nickname: true,
        roles: true,
        isActive: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          select: {
            roleId: true,
            role: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!user || user.deletedAt) {
      throw new BizException("USER_NOT_FOUND", { id });
    }

    return user;
  }

  /**
   * 创建用户
   * 1. 检查用户名唯一性
   * 2. bcrypt 哈希密码
   * 3. 雪花 ID 作为主键
   */
  async create(dto: CreateUserDto) {
    // 检查用户名唯一性（排除已软删除的用户）
    const existing = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existing) {
      throw new BizException("USERNAME_EXISTS", { name: dto.username });
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const id = this.snowflakeId.genString();

    const user = await this.prisma.user.create({
      data: {
        id,
        username: dto.username,
        password: hashedPassword,
        nickname: dto.nickname ?? dto.username,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`用户创建成功: ${user.username} (ID: ${user.id})`);

    return this.findOne(user.id);
  }

  /**
   * 更新用户信息（昵称 / 密码 / 启用状态）
   */
  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (dto.nickname !== undefined) data.nickname = dto.nickname;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    await this.prisma.user.update({ where: { id }, data });

    this.logger.log(`用户更新成功: ${id}`);
    return this.findOne(id);
  }

  /**
   * 软删除用户（设置 deletedAt 时间戳）
   */
  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`用户软删除成功: ${id}`);
  }

  /**
   * 分配用户角色（全量替换）
   * 传入的角色 ID 列表会完全替换该用户的现有角色
   */
  async assignRoles(userId: string, roleIds: string[]) {
    await this.findOne(userId);

    // 校验角色是否存在（排除已软删除的）
    const roles = await this.prisma.sysRole.findMany({
      where: { id: { in: roleIds }, deletedAt: null },
    });
    if (roles.length !== roleIds.length) {
      const foundIds = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((rid) => !foundIds.has(rid));
      throw new BizException("ROLE_NOT_FOUND", { id: missing.join(", ") });
    }

    // 事务：先删后插，全量替换
    await this.prisma.$transaction([
      this.prisma.sysUserRole.deleteMany({ where: { userId } }),
      this.prisma.sysUserRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      }),
    ]);

    // 同步 roles 字段（逗号分隔，兼容旧逻辑）
    const roleCodes = roles.map((r) => r.code).join(",");
    await this.prisma.user.update({
      where: { id: userId },
      data: { roles: roleCodes },
    });

    this.logger.log(`用户角色分配成功: ${userId} → [${roleIds.join(", ")}]`);
    return this.findOne(userId);
  }
}
