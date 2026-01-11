import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/src/__tests__/*.e2e.test.*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
