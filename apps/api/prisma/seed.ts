// @ts-nocheck
// Prisma adapter + tsx 导致类型推断为 error type / never，seed 脚本仅通过 tsx 运行，不受影响
// ban-ts-comment 规则由根 ESLint 配置针对 prisma/ 目录豁免

/**
 * 数据库种子脚本
 *
 * 初始化系统基础数据:
 * 1. admin 角色（超级管理员，拥有所有权限）
 * 2. 基础权限（用户/角色/菜单的 CRUD）
 * 3. 基础菜单（系统管理目录 + 用户/角色/菜单/权限管理）
 * 4. admin 用户（默认密码: admin123）
 * 5. 关联: admin ↔ 角色 ↔ 权限/菜单
 *
 * 运行方式:
 *   pnpm run prisma:seed          # 使用开发环境
 *   NODE_ENV=production pnpm run prisma:seed  # 生产环境
 */

import { config } from "dotenv";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getOffsetString } from "../src/common/time/timezone";
import * as bcrypt from "bcryptjs";

// 加载环境变量
const env = process.env.NODE_ENV ?? "development";
config({ path: [`.env.${env}`, ".env"] });

// 构建 PrismaClient（与 PrismaService 相同的连接方式）
const adapter = new PrismaMariaDb({
  host: process.env["DB_HOST"] ?? "localhost",
  port: Number(process.env["DB_PORT"]) || 3306,
  user: process.env["DB_USERNAME"] ?? "root",
  password: process.env["DB_PASSWORD"] ?? "",
  database: process.env["DB_DATABASE"] ?? "nestjs_dev",
  connectionLimit: 5,
  // 与 PrismaService 保持一致的时区,DATETIME 按 +08:00 存取
  timezone: getOffsetString(),
});

const prisma = new PrismaClient({ adapter });

/**
 * 初始化雪花 ID 生成器（与 SnowflakeIdService 相同的逻辑）
 * seed 脚本运行在 NestJS DI 容器外，需要手动初始化
 */
async function initSnowflake() {
  const machineId = Number(process.env["SNOWFLAKE_MACHINE_ID"]) || 1;
  const epochDate = process.env["SNOWFLAKE_EPOCH"] ?? "2025-01-01";
  const offset = new Date(epochDate).getTime();

  // ESM 兼容处理：snowflake-id 的导出为 { default: { default: SnowflakeId } }
  const mod = await import("snowflake-id");
  const SnowflakeIdCtor =
    (
      mod.default as {
        default?: new (...args: unknown[]) => { generate: () => bigint };
      }
    )?.default ??
    (mod.default as new (...args: unknown[]) => { generate: () => bigint });

  return new SnowflakeIdCtor({ mid: machineId, offset });
}

// ==================== 种子数据定义 ====================

/** 基础权限（code 作为唯一标识，ID 由雪花生成） */
const PERMISSIONS = [
  { name: "用户查看", code: "user:list", type: "api" },
  { name: "用户创建", code: "user:create", type: "api" },
  { name: "用户编辑", code: "user:update", type: "api" },
  { name: "用户删除", code: "user:delete", type: "api" },
  { name: "角色查看", code: "role:list", type: "api" },
  { name: "角色创建", code: "role:create", type: "api" },
  { name: "角色编辑", code: "role:update", type: "api" },
  { name: "角色删除", code: "role:delete", type: "api" },
  { name: "菜单查看", code: "menu:list", type: "api" },
  { name: "菜单创建", code: "menu:create", type: "api" },
  { name: "菜单编辑", code: "menu:update", type: "api" },
  { name: "菜单删除", code: "menu:delete", type: "api" },
  { name: "权限分配", code: "role:assign-permissions", type: "api" },
  { name: "菜单分配", code: "role:assign-menus", type: "api" },
  { name: "角色分配", code: "user:assign-roles", type: "api" },
];

/** 基础菜单（parentId 用于构建层级，ID 由雪花生成） */
const MENUS: Array<{
  name: string;
  path: string | null;
  component: string | null;
  parentCode: string; // 用 code 标识父级，运行时替换为实际 ID
  type: number;
  icon: string | null;
  sort: number;
  code: string; // 唯一标识，用于 upsert
}> = [
  {
    code: "system",
    name: "系统管理",
    path: "/system",
    component: null,
    parentCode: "",
    type: 1,
    icon: "Setting",
    sort: 0,
  },
  {
    code: "system-user",
    name: "用户管理",
    path: "/system/user",
    component: "system/user/index",
    parentCode: "system",
    type: 2,
    icon: "User",
    sort: 1,
  },
  {
    code: "system-role",
    name: "角色管理",
    path: "/system/role",
    component: "system/role/index",
    parentCode: "system",
    type: 2,
    icon: "Lock",
    sort: 2,
  },
  {
    code: "system-menu",
    name: "菜单管理",
    path: "/system/menu",
    component: "system/menu/index",
    parentCode: "system",
    type: 2,
    icon: "Menu",
    sort: 3,
  },
];

// ==================== 主逻辑 ====================

async function main() {
  console.log("🌱 开始执行种子脚本...\n");

  const snowflake = await initSnowflake();
  const genId = () => snowflake.generate().toString();

  // 1. 创建权限
  console.log("📋 创建权限...");
  const permissionRecords: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }> = [];
  for (const perm of PERMISSIONS) {
    const record = await prisma.sysPermission.upsert({
      where: { code: perm.code },
      update: {},
      create: { id: genId(), ...perm },
    });
    permissionRecords.push(record);
  }
  console.log(`   ✅ ${permissionRecords.length} 个权限\n`);

  // 2. 创建菜单（先创建目录，再创建子菜单）
  console.log("📁 创建菜单...");
  const menuIdMap = new Map<string, string>(); // code → id
  const menuRecords = [];

  // 按层级排序：先创建父级（parentCode 为空），再创建子级
  const sortedMenus = [...MENUS].sort((a, b) => {
    if (!a.parentCode) return -1;
    if (!b.parentCode) return 1;
    return 0;
  });

  for (const menu of sortedMenus) {
    const parentId = menu.parentCode
      ? (menuIdMap.get(menu.parentCode) ?? "0")
      : "0";
    const id = genId();
    const record = await prisma.sysMenu.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name: menu.name,
        path: menu.path,
        component: menu.component,
        parentId,
        type: menu.type,
        icon: menu.icon,
        sort: menu.sort,
      },
    });
    menuIdMap.set(menu.code, record.id);
    menuRecords.push(record);
  }
  console.log(`   ✅ ${menuRecords.length} 个菜单\n`);

  // 3. 创建 admin 角色
  console.log("🔑 创建 admin 角色...");
  const adminRole = await prisma.sysRole.upsert({
    where: { code: "admin" },
    update: {},
    create: {
      id: genId(),
      name: "超级管理员",
      code: "admin",
      description: "拥有系统所有权限，不可删除",
    },
  });
  console.log(`   ✅ ${adminRole.name} (${adminRole.code})\n`);

  // 4. 关联角色 ↔ 权限（全量）
  console.log("🔗 关联角色-权限...");
  await prisma.sysRolePermission.deleteMany({
    where: { roleId: adminRole.id },
  });
  await prisma.sysRolePermission.createMany({
    data: permissionRecords.map((p) => ({
      roleId: adminRole.id,
      permissionId: p.id,
    })),
  });
  console.log(`   ✅ ${permissionRecords.length} 条关联\n`);

  // 5. 关联角色 ↔ 菜单（全量）
  console.log("🔗 关联角色-菜单...");
  await prisma.sysRoleMenu.deleteMany({
    where: { roleId: adminRole.id },
  });
  await prisma.sysRoleMenu.createMany({
    data: menuRecords.map((m) => ({
      roleId: adminRole.id,
      menuId: m.id,
    })),
  });
  console.log(`   ✅ ${menuRecords.length} 条关联\n`);

  // 6. 创建 admin 用户
  console.log("👤 创建 admin 用户...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      id: genId(),
      username: "admin",
      password: hashedPassword,
      nickname: "超级管理员",
      roles: "admin",
      isActive: true,
    },
  });
  console.log(`   ✅ ${adminUser.username} (密码: admin123)\n`);

  // 7. 关联用户 ↔ 角色
  console.log("🔗 关联用户-角色...");
  await prisma.sysUserRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log(`   ✅ admin ↔ 超级管理员\n`);

  console.log("🎉 种子脚本执行完成！");
  console.log(`\n   登录信息:`);
  console.log(`   用户名: admin`);
  console.log(`   密码:   admin123`);
}

main()
  .catch((e: unknown) => {
    console.error("❌ 种子脚本执行失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
