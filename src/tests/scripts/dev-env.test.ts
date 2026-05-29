import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "../../..");
const scriptPath = join(repoRoot, "scripts/dev-env.mjs");

interface DevEnvModule {
  createDevServerSpawnConfig: (
    port: string,
    argv: string[],
    platform: NodeJS.Platform
  ) => { options: { shell?: boolean } };
}

function isDevEnvModule(value: unknown): value is DevEnvModule {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return typeof Reflect.get(value, "createDevServerSpawnConfig") === "function";
}

describe("dev environment launcher", () => {
  it("uses a shell when spawning pnpm on Windows", async () => {
    const module: unknown = await import(pathToFileURL(scriptPath).href);
    if (!isDevEnvModule(module)) {
      throw new Error("scripts/dev-env.mjs did not export spawn config helper");
    }

    expect(
      module.createDevServerSpawnConfig("6123", ["--host"], "win32").options
        .shell
    ).toBe(true);
  });

  it("prints a clear error when pnpm cannot be spawned", () => {
    const tempPath = mkdtempSync(join(tmpdir(), "mangrove-dev-env-"));

    try {
      const result = spawnSync(process.execPath, [scriptPath], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          MANGROVE_DEV_PORT: "6123",
          PATH: tempPath
        }
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Failed to start dev server:");
      expect(result.stderr).toContain("pnpm");
    } finally {
      rmSync(tempPath, { force: true, recursive: true });
    }
  });
});
