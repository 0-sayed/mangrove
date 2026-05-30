import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { createInitialRun, toRunSnapshot } from "@app/run-controller";

describe("DiagnosticsPanel", () => {
  it("stays hidden unless diagnostics are explicitly enabled", () => {
    const run = createInitialRun(12345);

    expect(renderToString(<DiagnosticsPanel snapshot={toRunSnapshot(run)} />)).toBe("");
  });
});
