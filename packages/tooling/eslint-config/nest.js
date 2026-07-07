// 引入 Node.js 运行环境的标准全局变量定义。
import globals from "globals";

// 导出 NestJS 应用通用配置。
// NestJS 应用使用 CommonJS 模块系统并依赖装饰器元数据，需要显式声明 sourceType 和 Node.js 全局变量，
// 以覆盖 baseConfig 中默认的 ESM 解析方式。
export const nestConfig = [
  {
    // 保留 nest-* 目录约定兼容后续可能出现的 NestJS 共享包，业务应用由动态工厂补充。
    files: ["apps/nest-*/**/*.ts", "packages/nest/**/*.ts"],
    languageOptions: {
      // NestJS 项目默认使用 CommonJS，覆盖 baseConfig 的 ESM 解析。
      sourceType: "commonjs",
      // NestJS 运行在 Node.js 环境，声明 process、Buffer、__dirname 等全局变量。
      globals: globals.node,
    },
  },
];

// 根据根配置识别出的应用目录生成 NestJS 应用规则。
// 与 reactConfig/createReactAppConfig 对称，业务应用目录名无需携带 nest- 前缀。
export function createNestAppConfig(appDirectories) {
  // 无 NestJS 应用时返回空数组，避免产生无匹配文件的配置块。
  if (appDirectories.length === 0) {
    return [];
  }

  // 匹配所有 NestJS 应用下的 TypeScript 源码。
  const sourceFiles = appDirectories.map((directory) => `${directory}/**/*.ts`);

  return [
    {
      files: sourceFiles,
      languageOptions: {
        sourceType: "commonjs",
        globals: globals.node,
      },
      rules: {
        // NestJS 项目采用渐进式 strict 收紧策略，先放宽 any 限制，后续按独立任务修复类型。
        "@typescript-eslint/no-explicit-any": "off",
        // 允许以 _ 开头的参数和变量不触发未使用告警，与 NestJS 原生约定一致。
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
      },
    },
  ];
}
