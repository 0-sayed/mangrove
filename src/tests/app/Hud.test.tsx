import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Hud } from "@app/Hud";
import { createInitialRun, getRunControls, toRunSnapshot } from "@app/run-controller";

describe("Hud", () => {
  it("omits static title chrome from the gameplay overlay", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    expect(html).not.toContain("Production Town");
    expect(html).not.toContain("Mangrove");
    expect(html).not.toContain("message-festival-v0");
  });

  it("renders atlas-backed meter icons with accessible labels", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    for (const [label, tone] of [
      ["Trust", "trust"],
      ["Budget", "budget"],
      ["Backlog", "backlog"]
    ] as const) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain("hud-icon");
      expect(html).toContain(`hud-icon--${tone}`);
    }

    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
    expect(html.match(/--hud-icon-image/g)).toHaveLength(3);
    expect(html.match(/--hud-icon-position/g)).toHaveLength(3);
    expect(html.match(/--hud-icon-size/g)).toHaveLength(3);
  });

  it("explains the run using general tower-defense language", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    expect(html).toContain("Build currency");
    expect(html).toContain("spent on defenses and upgrades");
    expect(html).toContain("buffer defense");
    expect(html).toContain("processor defense");
    expect(html).not.toContain("Current objective");
    expect(html).not.toContain("Trace the route");
    expect(html).not.toContain("spent on queue");
    expect(html).not.toContain("spent on queue and workers");
  });

  it("uses custom HUD tooltips without native title popups", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    expect(html).toContain("data-tooltip=");
    expect(html).not.toContain("title=");
  });
});
