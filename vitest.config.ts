import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,vue}"],
      exclude: ["src/main.ts", "src/types/**"],
      reporter: ["text", "html", "json-summary"],
      thresholds: { statements: 85, branches: 80, functions: 80, lines: 85 },
    },
  },
});
