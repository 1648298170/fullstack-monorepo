# 认证与验证码指南

本文档说明项目中的认证机制、滑块验证、手机号验证码注册和登录流程。

## 认证模块位置

| 文件或目录                                  | 说明                   |
| ------------------------------------------- | ---------------------- |
| `src/modules/auth/auth.controller.ts`       | 认证接口               |
| `src/modules/auth/auth.service.ts`          | 注册、登录、Token 签发 |
| `src/modules/auth/jwt.strategy.ts`          | JWT 解析策略           |
| `src/modules/captcha/`                      | 滑块验证模块           |
| `src/common/guards/auth.guard.ts`           | 全局认证守卫           |
| `src/common/guards/roles.guard.ts`          | 全局角色守卫           |
| `src/common/decorators/public.decorator.ts` | 公开接口装饰器         |

## 全局守卫规则

项目在 `main.ts` 中注册了全局守卫：

```typescript
app.useGlobalGuards(app.get(AuthGuard), app.get(RolesGuard));
```

默认情况下接口需要 JWT。公开接口必须显式添加 `@Public()`。

认证控制器整体已标记：

```typescript
@Public()
@Controller("auth")
export class AuthController {}
```

这意味着注册、登录、验证码相关接口都不需要登录态。

## Token 返回格式

注册或登录成功后返回：

```json
{
  "accessToken": "xxx",
  "refreshToken": "xxx",
  "tokenType": "Bearer"
}
```

前端请求受保护接口时，在请求头中携带：

```http
Authorization: Bearer <accessToken>
```

## 用户名密码登录

接口：

```http
POST /auth/login
```

请求体：

```json
{
  "username": "admin",
  "password": "123456",
  "captchaToken": "cap_xxx"
}
```

说明：

1. 默认不一定每次都要求滑块验证。
2. 当账号或 IP 登录失败次数达到阈值后，需要提交 `captchaToken`。
3. 登录成功后会清理短期失败计数。

## 滑块验证流程

滑块验证是防盗刷的第一层。前端需要先完成滑块，再用返回的 `captchaToken` 调用发短信接口。

### 创建滑块挑战

```http
POST /captcha/slider
```

返回内容包含 `captchaId`、滑块宽高、缺口位置等前端渲染所需数据。

### 校验滑块轨迹

```http
POST /captcha/slider/verify
```

请求体示例：

```json
{
  "captchaId": "cpt_xxx",
  "x": 120,
  "track": [
    { "x": 0, "y": 0, "t": 0 },
    { "x": 60, "y": 1, "t": 180 },
    { "x": 120, "y": 0, "t": 420 }
  ]
}
```

校验成功后返回：

```json
{
  "captchaToken": "cap_xxx",
  "expiresIn": 300
}
```

`captchaToken` 是一次性票据，被消费后不能重复使用。

## 手机号注册流程

手机号注册必须先滑块验证，再获取注册验证码。

### 1. 完成滑块验证

调用：

```http
POST /captcha/slider
POST /captcha/slider/verify
```

拿到 `captchaToken`。

### 2. 获取注册验证码

```http
POST /auth/mobile/register/code
```

请求体：

```json
{
  "mobile": "13800138000",
  "captchaToken": "cap_xxx"
}
```

后端处理：

1. 消费滑块 `captchaToken`
2. 判断手机号是否已注册
3. 判断 Redis 重发节流
4. 写入注册用途验证码

Redis Key：

```text
auth:mobile-code:register:{mobile}
auth:mobile-code-throttle:register:{mobile}
```

### 3. 提交注册

```http
POST /auth/mobile/register
```

请求体：

```json
{
  "mobile": "13800138000",
  "code": "123456",
  "nickname": "张三"
}
```

注册成功后直接返回 JWT Token。

## 手机号登录流程

手机号登录也必须先滑块验证，再获取登录验证码。

### 1. 完成滑块验证

调用滑块接口并拿到 `captchaToken`。

### 2. 获取登录验证码

```http
POST /auth/mobile/code
```

请求体：

```json
{
  "mobile": "13800138000",
  "captchaToken": "cap_xxx"
}
```

后端处理：

1. 消费滑块 `captchaToken`
2. 判断手机号是否已注册
3. 判断 Redis 重发节流
4. 写入登录用途验证码

Redis Key：

```text
auth:mobile-code:login:{mobile}
auth:mobile-code-throttle:login:{mobile}
```

### 3. 提交登录

```http
POST /auth/mobile/login
```

请求体：

```json
{
  "mobile": "13800138000",
  "code": "123456"
}
```

登录成功后返回 JWT Token。

## 验证码用途隔离

注册验证码和登录验证码分开存储：

```text
auth:mobile-code:register:{mobile}
auth:mobile-code:login:{mobile}
```

这样登录验证码不能用于注册，注册验证码也不能用于登录。

## 防盗刷策略

当前已有策略：

1. 发短信前必须先通过滑块验证。
2. `captchaToken` 一次性消费，不能重复使用。
3. 手机号验证码写 Redis，有过期时间。
4. 手机号发码有重发间隔。
5. 注册和登录验证码按用途隔离。
6. 登录接口不自动创建用户，未注册手机号不能走登录。

后续可增强：

1. 增加 IP 维度发码频率限制。
2. 增加设备指纹维度频率限制。
3. 增加手机号每日发送上限。
4. 短信发送接入队列，避免接口被第三方短信响应拖慢。
5. 正式接入第三方短信后移除响应中的 `mockCode`。
