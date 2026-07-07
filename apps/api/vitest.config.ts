import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 默认只运行单元测试（排除 E2E）
    include: ["src/**/*.spec.ts"],
    environment: "node",
    // 覆盖率配置
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/generated/**", "src/**/*.spec.ts", "src/**/*.d.ts"],
    },
    // 全局 setup — 加载 reflect-metadata（NestJS 依赖）
    setupFiles: ["./test/setup.ts"],
  },
});
