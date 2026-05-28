import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "src/tests/browser",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5177",
    trace: "on-first-retry"
  },
  webServer: {
    command: "pnpm dev",
    port: 5177,
    reuseExistingServer: !process.env["CI"],
    timeout: 60_000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});
