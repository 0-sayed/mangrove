import { defineConfig, devices } from "@playwright/test";
import { spawnSync } from "node:child_process";

function resolveDevPort() {
  if (process.env["MANGROVE_DEV_PORT"]) {
    return Number(process.env["MANGROVE_DEV_PORT"]);
  }

  const result = spawnSync(process.execPath, ["scripts/dev-env.mjs", "--print"], {
    encoding: "utf8"
  });
  const match = result.stdout?.match(/^MANGROVE_DEV_PORT=(?<port>\d+)$/m);

  return Number(match?.groups?.["port"] ?? 5177);
}

const devPort = resolveDevPort();

export default defineConfig({
  testDir: "src/tests/browser",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${devPort}`,
    trace: "on-first-retry"
  },
  webServer: {
    command: "node scripts/dev-env.mjs",
    port: devPort,
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
