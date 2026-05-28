import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@content": fileURLToPath(new URL("./src/content", import.meta.url)),
      "@game": fileURLToPath(new URL("./src/game", import.meta.url)),
      "@sim": fileURLToPath(new URL("./src/sim", import.meta.url)),
      "@tests": fileURLToPath(new URL("./src/tests", import.meta.url))
    }
  },
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50
      }
    },
    environment: "node",
    globals: true,
    include: ["src/tests/**/*.test.ts", "src/tests/**/*.test.tsx"],
    exclude: ["src/tests/browser/**"]
  }
});
