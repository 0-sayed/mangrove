import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { applyRunCommand, createInitialRun, toRunSnapshot } from "@app/run-controller";

describe("DiagnosticsPanel", () => {
  it("stays hidden unless diagnostics are explicitly enabled", () => {
    const run = createInitialRun(12345);

    expect(renderToString(<DiagnosticsPanel snapshot={toRunSnapshot(run)} />)).toBe("");
  });

  it("shows TD entity counts when diagnostics are enabled", () => {
    vi.stubEnv("VITE_MANGROVE_SHOW_DIAGNOSTICS", "true");
    const run = applyRunCommand(createInitialRun(12345), {
      type: "BuildTower",
      towerId: "worker-tower",
      padId: "pad-worker-a"
    });

    expect(renderToString(<DiagnosticsPanel snapshot={toRunSnapshot(run)} />)).toContain(
      "towers 1"
    );
    expect(renderToString(<DiagnosticsPanel snapshot={toRunSnapshot(run)} />)).toContain(
      "enemies 0"
    );

    vi.unstubAllEnvs();
  });
});
