# Prisma 使用指南

本文档用于帮助项目开发者快速上手本项目的 Prisma 使用方式。项目当前使用 Prisma 7 + MySQL，并通过 `@prisma/adapter-mariadb` 连接数据库。

## 目录位置

| 文件或目录                             | 说明                                              |
| -------------------------------------- | ------------------------------------------------- |
| `prisma/schema.prisma`                 | Prisma 数据模型定义文件                           |
| `prisma/migrations/`                   | 数据库迁移文件目录                                |
| `prisma.config.ts`                     | Prisma CLI 配置文件，负责加载环境变量和数据库连接 |
| `src/generated/prisma/`                | Prisma Client 生成目录，不需要手写修改            |
| `src/infra/database/prisma.service.ts` | NestJS 中封装后的 PrismaService                   |
| `src/infra/database/prisma.module.ts`  | 全局 Prisma 模块                                  |

## 环境变量

项目支持两种数据库连接配置方式。

推荐在 `.env.development` 中配置散列变量：

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=
DB_DATABASE=nestjs_dev
```

也可以直接配置完整连接串：

```env
DATABASE_URL=mysql://root:password@localhost:3306/nestjs_dev
```

`prisma.config.ts` 会按当前 `NODE_ENV` 加载 `.env.{NODE_ENV}`，再回退加载 `.env`。如果同时存在 `DATABASE_URL` 和散列变量，Prisma CLI 会优先使用 `DATABASE_URL`。

## 常用命令

所有命令都建议通过 pnpm script 执行，避免团队成员使用不同 Prisma 版本。

```bash
pnpm run prisma:generate
```

重新生成 Prisma Client。修改 `schema.prisma` 后必须执行。

```bash
pnpm run prisma:migrate
```

开发环境创建并应用迁移。适用于新增表、字段、索引、关系等结构变更。

```bash
pnpm run prisma:migrate:prod
```

生产环境应用已提交的迁移文件。生产环境不要使用 `migrate dev`。

```bash
pnpm run prisma:studio
```

打开 Prisma Studio，可视化查看和编辑数据库数据。

```bash
pnpm run prisma:pull
```

从已有数据库反向同步到 `schema.prisma`。只在数据库结构先被外部修改时使用。

```bash
pnpm run prisma:push
```

直接把 `schema.prisma` 推送到数据库，不生成迁移文件。团队协作和正式开发中慎用。

## 开发流程

新增或修改数据库结构时，按下面流程走：

1. 修改 `prisma/schema.prisma`
2. 执行 `pnpm run prisma:migrate`
3. 输入清晰的迁移名称，例如 `add_user_mobile`
4. 确认 `prisma/migrations/` 生成了新的迁移目录
5. 执行 `pnpm run prisma:generate`
6. 在业务代码中使用新的 Prisma Client 类型和字段
7. 提交 `schema.prisma` 和迁移文件

如果只是重新生成客户端：

```bash
pnpm run prisma:generate
```

## Schema 基础写法

Prisma 模型名使用 PascalCase，数据库表名通过 `@@map()` 映射为真实表名。

```prisma
model User {
  id        String    @id @db.VarChar(20)
  username  String    @unique @db.VarChar(50)
  password  String    @db.VarChar(200)
  nickname  String?   @db.VarChar(100)
  roles     String    @default("user") @db.VarChar(200)
  isActive  Boolean   @default(true)
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("sys_user")
}
```

常用注解：

| 注解              | 说明                 |
| ----------------- | -------------------- |
| `@id`             | 主键                 |
| `@unique`         | 唯一索引             |
| `@default()`      | 默认值               |
| `@updatedAt`      | 更新时自动刷新时间   |
| `@map()`          | 字段映射到数据库列名 |
| `@@map()`         | 模型映射到数据库表名 |
| `@db.VarChar(50)` | 指定数据库字段类型   |

## 表名和模型名

项目里 Prisma 模型名不等于数据库表名。

| Prisma 模型         | 数据库表              |
| ------------------- | --------------------- |
| `User`              | `sys_user`            |
| `SysRole`           | `sys_role`            |
| `SysPermission`     | `sys_permission`      |
| `SysMenu`           | `sys_menu`            |
| `SysUserRole`       | `sys_user_role`       |
| `SysRolePermission` | `sys_role_permission` |
| `SysRoleMenu`       | `sys_role_menu`       |

业务代码里使用模型名对应的小驼峰属性：

```typescript
await this.prisma.user.findMany();
await this.prisma.sysRole.findMany();
await this.prisma.sysMenu.findMany();
```

## 在 NestJS 中使用 Prisma

`PrismaModule` 已经是全局模块，业务模块不需要重复导入。直接在 Service 中注入即可。

```typescript
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../infra/database/prisma.service";

@Injectable()
export class ExampleService {
  constructor(private readonly prisma: PrismaService) {}

  async findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
}
```

注意：项目约定软删除字段为 `deletedAt`，查询业务数据时通常要排除软删除记录。

```typescript
const user = await this.prisma.user.findFirst({
  where: {
    id,
    deletedAt: null,
  },
});
```

## 常见查询示例

按唯一字段查询：

```typescript
const user = await this.prisma.user.findUnique({
  where: { username: "admin" },
});
```

按条件查询第一条：

```typescript
const user = await this.prisma.user.findFirst({
  where: {
    username: "admin",
    deletedAt: null,
  },
});
```

分页查询：

```typescript
const page = 1;
const pageSize = 10;

const [list, total] = await Promise.all([
  this.prisma.user.findMany({
    where: { deletedAt: null },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { createdAt: "desc" },
  }),
  this.prisma.user.count({
    where: { deletedAt: null },
  }),
]);
```

创建数据：

```typescript
const user = await this.prisma.user.create({
  data: {
    id: this.snowflakeId.genString(),
    username: "zhangsan",
    password: hashedPassword,
    nickname: "张三",
  },
});
```

更新数据：

```typescript
await this.prisma.user.update({
  where: { id },
  data: {
    nickname: "新昵称",
  },
});
```

软删除：

```typescript
await this.prisma.user.update({
  where: { id },
  data: {
    deletedAt: new Date(),
  },
});
```

## 关系查询

项目中用户、角色、权限、菜单之间通过中间表维护多对多关系。

查询用户及角色关系：

```typescript
const user = await this.prisma.user.findUnique({
  where: { id },
  include: {
    userRoles: {
      include: {
        role: true,
      },
    },
  },
});
```

查询角色及权限关系：

```typescript
const role = await this.prisma.sysRole.findUnique({
  where: { id },
  include: {
    rolePermissions: {
      include: {
        permission: true,
      },
    },
  },
});
```

## 事务

多个写操作必须同时成功或失败时使用事务。

数组事务适合简单的多个 Prisma 操作：

```typescript
await this.prisma.$transaction([
  this.prisma.sysUserRole.deleteMany({
    where: { userId },
  }),
  this.prisma.sysUserRole.createMany({
    data: roleIds.map((roleId) => ({ userId, roleId })),
  }),
]);
```

交互式事务适合中间需要根据查询结果继续判断的场景：

```typescript
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.findFirst({
    where: { id, deletedAt: null },
  });

  if (!user) {
    throw new Error("用户不存在");
  }

  await tx.user.update({
    where: { id },
    data: { nickname: "新昵称" },
  });
});
```

## 原生 SQL

优先使用 Prisma Client API。确实需要原生 SQL 时，使用参数化写法，避免 SQL 注入。

```typescript
const rows = await this.prisma.$queryRaw`
  SELECT id, username
  FROM sys_user
  WHERE username = ${username}
`;
```

不要拼接用户输入：

```typescript
// 不要这样写
await this.prisma.$queryRawUnsafe(
  `SELECT * FROM sys_user WHERE username = '${username}'`
);
```

## 本项目注意事项

1. `src/generated/prisma/` 是生成产物，不要手写修改。
2. 修改 `schema.prisma` 后要重新执行 `pnpm run prisma:generate`。
3. 开发结构变更优先使用 `pnpm run prisma:migrate`，不要随意使用 `db push`。
4. 生产环境只执行 `pnpm run prisma:migrate:prod`。
5. 查询用户、角色、菜单等业务数据时，记得处理 `deletedAt: null`。
6. 主键使用 `SnowflakeIdService` 生成字符串 ID，不使用数据库自增 ID。
7. `PrismaService` 已全局注册，业务模块直接注入即可。
8. 当前项目使用 `@prisma/adapter-mariadb` 连接 MySQL（Prisma 7 中 MySQL 与 MariaDB 共用此适配器），不要在业务代码里自行 new `PrismaClient`。

## 迁移命名规范

迁移名称要描述“做了什么结构变更”，使用小写英文和下划线。

推荐：

```text
create_order_table
add_user_mobile
add_role_menu_relation
rename_menu_path_column
add_user_username_unique_index
```

不推荐：

```text
update
fix
test
change_table
new_migration
```

命名建议：

1. 新建表使用 `create_<table>_table`。
2. 新增字段使用 `add_<table>_<field>`。
3. 删除字段使用 `drop_<table>_<field>`。
4. 新增关系使用 `add_<a>_<b>_relation`。
5. 新增索引使用 `add_<table>_<field>_index`。
6. 修复结构使用更具体的描述，不要只写 `fix`。

执行示例：

```bash
pnpm run prisma:migrate -- --name add_user_mobile
```

如果直接执行 `pnpm run prisma:migrate`，Prisma 会交互式询问迁移名称。

## 常见报错排查

### Prisma Client 没有生成

常见现象：

```text
Cannot find module '../../generated/prisma/client'
```

处理：

```bash
pnpm run prisma:generate
```

### schema 修改后代码类型不更新

处理顺序：

1. 执行 `pnpm run prisma:generate`
2. 重启 `pnpm start:dev`
3. 重启编辑器 TypeScript Server

### 数据库连接失败

常见现象：

```text
Can't reach database server
Access denied for user
Unknown database
```

排查：

1. MySQL 是否启动。
2. `.env.development` 是否配置正确。
3. `DB_DATABASE` 对应数据库是否存在。
4. 用户名密码是否正确。
5. 当前命令是否在项目根目录执行。

### 迁移历史和数据库不一致

常见现象：

```text
Drift detected
The database schema is not in sync with the migration history
```

处理原则：

1. 先确认是否有人手动改过数据库结构。
2. 本地开发库可以考虑备份后重置。
3. 共享环境不要直接 reset，先对比差异并补迁移。
4. 不要删除已经提交并被别人使用的迁移文件。

### 字段已存在或表已存在

常见原因是数据库已经被手动改过，或迁移被部分执行。

建议：

1. 本地环境优先重建数据库后重新执行迁移。
2. 共享环境先检查 `prisma/migrations` 和数据库真实结构。
3. 必要时使用 `prisma migrate resolve` 标记迁移状态，但要先和团队确认。

### 生成的类型和数据库真实结构不一致

先确认谁是事实来源：

1. 正常开发以 `prisma/schema.prisma` 和迁移文件为准。
2. 如果数据库被外部系统改过，使用 `pnpm run prisma:pull` 同步。
3. 同步后必须执行 `pnpm run prisma:generate`。

### 修改 schema 后 TypeScript 还提示字段不存在

先重新生成 Prisma Client：

```bash
pnpm run prisma:generate
```

如果仍然不生效，重启 TypeScript Server 或重新启动开发服务。

### `prisma migrate dev` 连接不上数据库

检查以下内容：

1. MySQL 是否已启动
2. `.env.development` 中数据库配置是否正确
3. `DB_DATABASE` 对应的数据库是否已创建
4. 当前命令是否在项目根目录执行

### 数据库已有改动，schema 不一致

如果数据库结构是外部工具改的，可以先执行：

```bash
pnpm run prisma:pull
pnpm run prisma:generate
```

但团队开发中应尽量从 `schema.prisma` 和迁移文件管理结构变更，避免多人环境漂移。

### 什么时候用 `db push`

`db push` 不生成迁移文件，适合临时验证模型或本地快速试验。正式功能开发建议使用 `migrate dev`，确保迁移历史可追踪。

## 推荐提交内容

涉及数据库结构变更时，一般需要一起提交：

```text
prisma/schema.prisma
prisma/migrations/<timestamp>_<migration_name>/migration.sql
相关业务代码
相关测试
```

不要提交：

```text
src/generated/prisma/
node_modules/
dist/
coverage/
本地 .env 文件
```
