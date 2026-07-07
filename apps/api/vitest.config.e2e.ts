import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    environment: "node",
    hookTimeout: 30000,
    testTimeout: 30000,
    setupFiles: ["./test/setup.ts"],
  },
});
