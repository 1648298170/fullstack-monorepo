# 接口响应与错误码指南

本文档说明项目统一响应格式、业务异常、错误码和 Swagger 错误示例的维护方式。

## 成功响应格式

项目通过 `TransformInterceptor` 统一包装成功响应。

Controller 原始返回：

```json
{
  "id": "1",
  "username": "admin"
}
```

实际响应：

```json
{
  "code": 200,
  "data": {
    "id": "1",
    "username": "admin"
  },
  "message": "success"
}
```

业务代码只需要返回真实数据，不需要手动包一层 `code/data/message`。

## 错误响应格式

项目通过 `AllExceptionsFilter` 统一包装错误响应。

示例：

```json
{
  "code": 20001,
  "message": "用户名或密码错误",
  "timestamp": "2026-07-01T17:00:00.000+08:00",
  "path": "/auth/login"
}
```

字段说明：

| 字段        | 说明                               |
| ----------- | ---------------------------------- |
| `code`      | 业务码，非业务异常时为 HTTP 状态码 |
| `message`   | 错误提示                           |
| `timestamp` | 带项目时区的时间                   |
| `path`      | 请求路径                           |

## 业务异常

业务错误使用 `BizException` 抛出。

```typescript
throw new BizException("USER_NOT_FOUND", { id });
throw new BizException("BAD_CREDENTIALS");
```

不要在 Controller 中手动 `try/catch` 包业务错误。Service 层抛出异常后，全局过滤器会统一处理。

## 错误码定义

错误码统一维护在：

```text
src/common/result/result-code.ts
```

结构：

```typescript
export const ResultCode = {
  BAD_CREDENTIALS: {
    code: 20001,
    httpStatus: 401,
    message: "用户名或密码错误",
  },
};
```

字段说明：

| 字段         | 说明                                    |
| ------------ | --------------------------------------- |
| `code`       | 前端和业务识别用的业务码                |
| `httpStatus` | HTTP 状态码                             |
| `message`    | 默认错误提示，支持 `{placeholder}` 占位 |

## 编号建议

当前项目按模块区分错误码：

| 范围    | 模块     |
| ------- | -------- |
| `200`   | 成功     |
| `1xxxx` | 用户模块 |
| `2xxxx` | 认证模块 |
| `3xxxx` | 角色模块 |
| `4xxxx` | 菜单模块 |

新增模块时建议继续按模块分段，避免复用同一个业务码表达不同语义。

## 带参数错误信息

错误信息可以使用占位符：

```typescript
USER_NOT_FOUND: {
  code: 10001,
  httpStatus: 404,
  message: '用户不存在: {id}',
}
```

抛出异常：

```typescript
throw new BizException("USER_NOT_FOUND", { id: "123" });
```

响应：

```json
{
  "code": 10001,
  "message": "用户不存在: 123"
}
```

## Swagger 错误示例

Swagger 错误示例使用：

```text
src/common/swagger/error-example.ts
```

示例：

```typescript
const UNAUTHORIZED_EXAMPLE = errorExample(
  "BAD_CREDENTIALS",
  undefined,
  "/auth/login"
);
```

Controller 中使用：

```typescript
@ApiUnauthorizedResponse({
  description: '用户名或密码错误 / 账户已被禁用',
  schema: { example: UNAUTHORIZED_EXAMPLE },
})
```

这样 Swagger 示例会从 `ResultCode` 自动派生 `code` 和 `message`，避免文档和实际响应不一致。

## 新增业务错误流程

1. 在 `src/common/result/result-code.ts` 添加错误码。
2. 在 Service 中使用 `throw new BizException('错误码 Key')`。
3. 如果接口文档需要展示错误示例，使用 `errorExample()`。
4. 添加或更新对应单元测试。

## 常见约定

1. Controller 不手动包装成功响应。
2. Controller 不手动捕获业务异常。
3. Service 层抛出 `BizException`。
4. DTO 校验错误由全局 `ValidationPipe` 处理。
5. 新增错误码时优先复用相同语义，不要为同一语义重复造码。
6. Swagger 示例不要手写业务码，优先使用 `errorExample()`。
