import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Hud } from "@app/Hud";
import {
  advanceRun,
  applyRunCommand,
  createInitialRun,
  getRunControls,
  toRunSnapshot
} from "@app/run-controller";

describe("Hud", () => {
  it("renders TD meters with atlas-backed icons", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    for (const [label, tone] of [
      ["Town Health", "town-health"],
      ["Build Budget", "build-budget"],
      ["Pressure", "pressure"]
    ] as const) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).toContain("hud-icon");
      expect(html).toContain(`hud-icon--${tone}`);
    }

    expect(html.match(/aria-hidden="true"/g)).toHaveLength(3);
    expect(html.match(/--hud-icon-image/g)).toHaveLength(3);
  });

  it("uses TD controls and removes prototype labels", () => {
    const run = createInitialRun(12345);
    const html = renderToString(
      <Hud
        snapshot={toRunSnapshot(run)}
        controls={getRunControls(run.game)}
        onCommand={() => undefined}
      />
    );

    expect(html).toContain("Start Normal Flow");
    expect(html).toContain("Build Worker Tower (30)");
    for (const removedLabel of [
      "Trust",
      "Backlog",
      "Workers",
      "Build Queue Hub",
      "Start Opening Flow",
      "Prepare",
      "No wave"
    ]) {
      expect(html).not.toContain(removedLabel);
    }
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

  it("shows explicit start-wave button states while running, between waves, and after completion", () => {
    const started = applyRunCommand(createInitialRun(12345), {
      type: "StartWave",
      waveId: "wave-normal-flow"
    });
    const recap = advanceRun(started, 92);
    const finalWaveStarted = applyRunCommand(
      advanceRun(
        applyRunCommand(recap, {
          type: "StartWave",
          waveId: "wave-burst-surge"
        }),
        120
      ),
      {
        type: "StartWave",
        waveId: "wave-hot-shard"
      }
    );
    const completed = advanceRun(finalWaveStarted, 120);

    const runningHtml = renderToString(
      <Hud
        snapshot={toRunSnapshot(started)}
        controls={getRunControls(started.game)}
        onCommand={() => undefined}
      />
    );
    const recapHtml = renderToString(
      <Hud
        snapshot={toRunSnapshot(recap)}
        controls={getRunControls(recap.game)}
        onCommand={() => undefined}
      />
    );
    const completedHtml = renderToString(
      <Hud
        snapshot={toRunSnapshot(completed)}
        controls={getRunControls(completed.game)}
        onCommand={() => undefined}
      />
    );

    expect(runningHtml).toContain("Normal Flow Running");
    expect(runningHtml).not.toContain("Start Normal Flow");
    expect(recapHtml).toContain("Start Burst Surge");
    expect(recapHtml).not.toContain("No Wave Available");
    expect(completedHtml).toContain("No Wave Available");
    expect(completedHtml).not.toContain("Start Complete");
  });
});
