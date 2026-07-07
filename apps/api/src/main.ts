import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe, type LogLevel } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { AppLogger } from "./infra/logger/app-logger";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuthGuard } from "./common/guards/auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { toZonedISO } from "./common/time/timezone";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// 运行时读取 package.json(避免静态 import 把根 package.json 纳入 tsc 编译图，
// 导致 rootDir 被撑到项目根、dist 输出多出 src/ 层)
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8")
) as { version: string };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 注册自定义日志器为全局默认 Logger
  // 所有 new Logger() 调用将自动使用 AppLogger（包括 NestJS 内部日志）
  const appLogger = app.get(AppLogger);
  app.useLogger(appLogger);

  // 读取应用配置
  const configService = app.get(ConfigService);
  const port = configService.get<number>("app.port", 3000);
  const nodeEnv = configService.get<string>("nodeEnv", "development");

  // 设置日志级别（根据环境变量 LOG_LEVEL 控制）
  const logLevel = configService.get<string>("log.level", "info");
  appLogger.setLogLevels(
    nodeEnv === "development"
      ? (["verbose", "debug", "log", "warn", "error", "fatal"] as LogLevel[])
      : ([logLevel, "warn", "error", "fatal"] as LogLevel[])
  );

  // 全局 ValidationPipe — 启用 DTO 自动校验，拒绝非法请求参数
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除 DTO 中未声明的属性
      forbidNonWhitelisted: true, // 存在未声明属性时抛出错误
      transform: true, // 自动将请求参数转为 DTO 类型
    })
  );

  // 全局异常过滤器 — 统一错误响应格式 { code, message, timestamp, path }
  app.useGlobalFilters(new AllExceptionsFilter(appLogger));

  // 全局响应拦截器 — 统一成功响应格式 { code, data, message }
  app.useGlobalInterceptors(new TransformInterceptor());

  // 全局守卫 — 按注册顺序执行: AuthGuard(认证) → RolesGuard(角色)
  app.useGlobalGuards(app.get(AuthGuard), app.get(RolesGuard));

  // 全局 JSON 序列化:响应中的 Date 统一输出为「带时区偏移」的 ISO 字符串
  // (如 2025-06-20T16:00:00.000+08:00),不再使用 UTC(Z)格式
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.set(
    "json replacer",
    function (this: unknown, key: string, value: unknown): unknown {
      const holder = this as Record<string, unknown> | null;
      if (holder && holder[key] instanceof Date) {
        return toZonedISO(holder[key]);
      }
      return value;
    }
  );

  // Swagger/OpenAPI 文档配置
  const swaggerConfig = new DocumentBuilder()
    .setTitle("NestJS API")
    .setDescription("NestJS 项目接口文档")
    .setVersion(packageJson.version)
    .addServer("/", "Current service")
    // JWT Bearer 认证：Swagger UI 可输入 Token 测试受保护接口
    .addBearerAuth(
      { type: "http", scheme: "bearer", bearerFormat: "JWT", in: "header" },
      "JWT"
    )
    // 全局默认 security：所有接口默认需要 Bearer Token（@Public() 接口不受影响）
    .addSecurityRequirements("JWT")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  const swaggerJsonDocumentUrl = "/api-docs-json";
  SwaggerModule.setup("api-docs", app, document, {
    jsonDocumentUrl: swaggerJsonDocumentUrl,
    customCss: `
      .swagger-ui .info .openapi-json-url {
        margin: 6px 0 14px;
        font-size: 14px;
      }

      .swagger-ui .info .openapi-json-url a {
        color: #4990e2;
        text-decoration: none;
      }

      .swagger-ui .info .openapi-json-url a:hover {
        text-decoration: underline;
      }

      .swagger-path-search {
        max-width: 1460px;
        margin: 0 auto 16px;
        padding: 0 20px;
      }

      .swagger-path-search input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid #d8dde3;
        border-radius: 4px;
        font-size: 14px;
        outline: none;
      }

      .swagger-path-search input:focus {
        border-color: #4990e2;
      }
    `,
    customJsStr: `
      window.addEventListener('load', function () {
        var openApiUrlAttempts = 0;
        var pathSearchAttempts = 0;

        function addOpenApiJsonUrl() {
          var info = document.querySelector('.swagger-ui .info');
          openApiUrlAttempts += 1;

          if (!info && openApiUrlAttempts < 20) {
            window.setTimeout(addOpenApiJsonUrl, 100);
            return;
          }

          if (!info || info.querySelector('.openapi-json-url')) {
            return;
          }

          var link = document.createElement('a');
          link.href = window.location.origin + '${swaggerJsonDocumentUrl}';
          link.textContent = link.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';

          var row = document.createElement('div');
          row.className = 'openapi-json-url';
          row.appendChild(link);
          info.insertBefore(row, info.querySelector('.description') || null);
        }

        addOpenApiJsonUrl();

        function createPathSearch() {
          var swaggerContainer = document.querySelector('.swagger-ui');
          var informationContainer = document.querySelector(
            '.swagger-ui .information-container'
          );
          pathSearchAttempts += 1;

          if (
            (!swaggerContainer || !informationContainer) &&
            pathSearchAttempts < 30
          ) {
            window.setTimeout(createPathSearch, 100);
            return;
          }

          if (
            !swaggerContainer ||
            !informationContainer ||
            document.querySelector('.swagger-path-search')
          ) {
            return;
          }

          var wrapper = document.createElement('div');
          wrapper.className = 'swagger-path-search';

          var input = document.createElement('input');
          input.type = 'search';
          input.placeholder = '搜索接口路径，例如 /users、/roles/page';

          wrapper.appendChild(input);
          informationContainer.insertAdjacentElement('afterend', wrapper);

          input.addEventListener('input', function () {
            var keyword = input.value.trim().toLowerCase();

            document
              .querySelectorAll('.swagger-ui .opblock-tag-section')
              .forEach(function (section) {
                var operations = section.querySelectorAll('.opblock');
                var hasVisibleOperation = false;

                operations.forEach(function (operation) {
                  var pathElement = operation.querySelector(
                    '.opblock-summary-path'
                  );
                  var methodElement = operation.querySelector(
                    '.opblock-summary-method'
                  );
                  var descriptionElement = operation.querySelector(
                    '.opblock-summary-description'
                  );

                  var searchableText = [
                    pathElement ? pathElement.textContent : '',
                    methodElement ? methodElement.textContent : '',
                    descriptionElement ? descriptionElement.textContent : '',
                  ]
                    .join(' ')
                    .toLowerCase();

                  var matched = !keyword || searchableText.includes(keyword);
                  operation.style.display = matched ? '' : 'none';

                  if (matched) {
                    hasVisibleOperation = true;
                  }
                });

                section.style.display =
                  hasVisibleOperation || !keyword ? '' : 'none';
              });
          });
        }

        createPathSearch();
      });
    `,
    swaggerOptions: {
      // 响应/请求模型默认展开 5 层，无需点击即可看到嵌套字段说明（如 data → 用户字段 → 角色明细）
      defaultModelExpandDepth: 5,
      // 底部「Schemas」组件区默认展开深度
      defaultModelsExpandDepth: 3,
      // 接口分组(模块)默认折叠，点击 tag 才展开其下接口
      docExpansion: "list",
      // 刷新页面后保留已输入的 Bearer Token，便于持续调试
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  appLogger.log(`应用已启动，监听端口: ${port}，环境: ${nodeEnv}`);
  appLogger.log(`Swagger 文档地址: http://localhost:${port}/api-docs`);
}
void bootstrap();
