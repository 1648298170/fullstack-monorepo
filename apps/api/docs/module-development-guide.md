# 模块开发指南

本文档说明新增业务模块时的推荐目录、代码分层、DTO/VO、Swagger 和测试写法。

## 标准目录结构

新增功能模块时，优先按功能聚合：

```text
src/modules/example/
  example.module.ts
  example.controller.ts
  example.service.ts
  example.service.spec.ts
  dto/
    create-example.dto.ts
    update-example.dto.ts
    query-example.dto.ts
  vo/
    example-detail.vo.ts
    example-page.vo.ts
```

命名约定：

| 类型     | 命名       |
| -------- | ---------- |
| 文件名   | kebab-case |
| 类名     | PascalCase |
| 方法名   | camelCase  |
| DTO      | `XxxDto`   |
| 响应对象 | `XxxVo`    |

## Module

模块负责组织 Controller 和 Provider。

```typescript
import { Module } from "@nestjs/common";

import { ExampleController } from "./example.controller";
import { ExampleService } from "./example.service";

@Module({
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
```

如果模块需要被其他模块调用，需要导出 Service：

```typescript
@Module({
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
```

## Controller

Controller 只负责 HTTP 入参、路由、Swagger 文档和调用 Service。

```typescript
import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CreateExampleDto } from "./dto/create-example.dto";
import { ExampleService } from "./example.service";

@ApiTags("示例")
@Controller("examples")
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  /**
   * 创建示例。
   */
  @Post()
  @ApiOperation({ summary: "创建示例" })
  create(@Body() dto: CreateExampleDto) {
    return this.exampleService.create(dto);
  }

  /**
   * 查询示例详情。
   */
  @Get(":id")
  @ApiOperation({ summary: "查询示例详情" })
  findOne(@Param("id") id: string) {
    return this.exampleService.findOne(id);
  }
}
```

注意：

1. 不在 Controller 中写复杂业务逻辑。
2. 不在 Controller 中手动包装响应。
3. 不在 Controller 中手动 `try/catch` 业务异常。
4. 公开接口需要添加 `@Public()`。

## Service

Service 负责业务逻辑、数据库访问和业务异常。

```typescript
import { Injectable } from "@nestjs/common";

import { BizException } from "../../common/result/biz.exception";
import { PrismaService } from "../../infra/database/prisma.service";
import { SnowflakeIdService } from "../../infra/snowflake/snowflake-id.service";
import { CreateExampleDto } from "./dto/create-example.dto";

@Injectable()
export class ExampleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snowflakeId: SnowflakeIdService
  ) {}

  /**
   * 创建示例。
   */
  async create(dto: CreateExampleDto) {
    return this.prisma.example.create({
      data: {
        id: this.snowflakeId.genString(),
        name: dto.name,
      },
    });
  }

  /**
   * 查询示例详情。
   */
  async findOne(id: string) {
    const item = await this.prisma.example.findFirst({
      where: { id, deletedAt: null },
    });

    if (!item) {
      throw new BizException("EXAMPLE_NOT_FOUND", { id });
    }

    return item;
  }
}
```

## DTO

DTO 使用 class，并通过 `class-validator` 声明校验规则。

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * 创建示例 DTO。
 */
export class CreateExampleDto {
  /** 示例名称。 */
  @ApiProperty({ description: "示例名称", example: "示例 A" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}
```

注意：

1. DTO 字段要写 Swagger `ApiProperty`。
2. DTO 字段要写校验装饰器。
3. DTO 类和字段建议写中文注释。
4. 不使用 interface 作为请求 DTO。

## VO

VO 用于描述响应结构，便于 Swagger 展示。

```typescript
import { ApiProperty } from "@nestjs/swagger";

/**
 * 示例详情响应对象。
 */
export class ExampleDetailVo {
  /** 示例 ID。 */
  @ApiProperty({ description: "示例 ID", example: "1234567890" })
  id: string;

  /** 示例名称。 */
  @ApiProperty({ description: "示例名称", example: "示例 A" })
  name: string;
}
```

Controller 中使用：

```typescript
@ApiOkResponse({
  description: '查询成功',
  type: ResponseVo(ExampleDetailVo),
})
```

## 权限控制

默认接口受全局 `AuthGuard` 保护。

公开接口：

```typescript
@Public()
@Post('login')
login() {}
```

角色接口：

```typescript
@Roles('admin')
@Delete(':id')
remove() {}
```

## 新增模块清单

1. 新建 `src/modules/<feature>/` 目录。
2. 创建 Module、Controller、Service。
3. 创建 DTO 和 VO。
4. 在根模块或对应上级模块注册新模块。
5. 如需数据库表，修改 `prisma/schema.prisma` 并创建迁移。
6. 在 `src/common/result/result-code.ts` 添加必要业务错误码。
7. 编写单元测试。
8. 在 Swagger 中补充接口说明和响应示例。

## 注释要求

项目代码注释使用中文。

建议补注释的位置：

1. Controller 接口方法。
2. Service 公开方法和复杂私有方法。
3. DTO 类和字段。
4. VO 类和字段。
5. 复杂分支、事务、缓存 Key、风控逻辑。

不要写无意义注释，例如“给变量赋值”。注释应该解释业务意图、边界和约定。
