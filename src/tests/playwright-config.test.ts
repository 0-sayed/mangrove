import { describe, expect, it, vi } from "vitest";

const spawnSync = vi.fn();

vi.mock("node:child_process", () => ({
  spawnSync
}));

async function importPlaywrightConfig() {
  vi.resetModules();
  return import("../../playwright.config");
}

describe("playwright config", () => {
  it("uses MANGROVE_DEV_PORT without spawning the dev-env helper", async () => {
    vi.stubEnv("MANGROVE_DEV_PORT", "6123");
    spawnSync.mockReturnValue({ stdout: "MANGROVE_DEV_PORT=5177\n" });

    const { default: config } = await importPlaywrightConfig();

    expect(spawnSync).not.toHaveBeenCalled();
    expect(config.use?.baseURL).toBe("http://127.0.0.1:6123");
    expect(config.webServer).toMatchObject({ port: 6123 });
  });

  it("falls back to the default port when dev-env output is unavailable", async () => {
    vi.stubEnv("MANGROVE_DEV_PORT", undefined);
    spawnSync.mockReturnValue({ stdout: null });

    const { default: config } = await importPlaywrightConfig();

    expect(spawnSync).toHaveBeenCalledOnce();
    expect(config.use?.baseURL).toBe("http://127.0.0.1:5177");
    expect(config.webServer).toMatchObject({ port: 5177 });
  });
});
