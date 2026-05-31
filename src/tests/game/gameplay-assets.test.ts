import { describe, expect, it } from "vitest";

import {
  FIRST_PLAYABLE_ANIMATION_IDS,
  GAMEPLAY_ATLAS,
  animationFrameConfigs,
  animationFrameNames,
  atlasCssFrame,
  firstFrameName
} from "@game/gameplay-assets";

describe("gameplay asset registry", () => {
  it("points Phaser at the generated gameplay atlas files", () => {
    expect(GAMEPLAY_ATLAS.key).toBe("gameplay-atlas");
    expect(GAMEPLAY_ATLAS.imageUrl).toContain("gameplay-atlas.png");
    expect(GAMEPLAY_ATLAS.dataUrl).toContain("gameplay-atlas.json");
  });

  it("covers first-playable runtime asset ids with atlas-backed frames", () => {
    expect(FIRST_PLAYABLE_ANIMATION_IDS).toEqual([
      "map-ground-grass",
      "map-ground-plaza",
      "map-lane-traffic",
      "map-lane-job",
      "map-lane-data",
      "map-spawn-festival-gate",
      "map-exit-storage-fixed",
      "map-build-slot-ingress",
      "map-build-slot-worker",
      "map-build-slot-queue",
      "map-placement-preview-valid",
      "map-placement-preview-invalid",
      "building-api-gate-flowing",
      "building-api-gate-saturated",
      "building-api-gate-dropping",
      "building-worker-yard-idle",
      "building-worker-yard-working",
      "building-worker-yard-saturated",
      "building-queue-hub-empty",
      "building-queue-hub-filling",
      "building-queue-hub-backing-up",
      "building-queue-hub-overflowing",
      "packet-useful",
      "packet-useful-queued",
      "packet-useful-processing",
      "packet-flood",
      "packet-expiring",
      "effect-message-spawn",
      "effect-message-accepted",
      "effect-message-queued",
      "effect-worker-start",
      "effect-ack-delivered",
      "effect-drop",
      "effect-timeout-expired",
      "effect-overflow",
      "effect-backlog-saturation",
      "effect-trust-loss",
      "effect-budget-gain",
      "effect-wave-start",
      "effect-wave-end",
      "badge-api",
      "badge-queue",
      "badge-worker",
      "badge-storage-exit",
      "ui-frame-hud",
      "ui-icon-trust",
      "ui-icon-budget",
      "ui-icon-backlog",
      "ui-meter-trust",
      "ui-meter-budget",
      "ui-meter-backlog",
      "ui-button-start-wave",
      "ui-button-build-queue",
      "ui-control-worker-count",
      "ui-recap-delivered",
      "ui-recap-dropped",
      "ui-recap-backlog-peak"
    ]);

    for (const animationId of FIRST_PLAYABLE_ANIMATION_IDS) {
      expect(animationFrameNames(animationId).length).toBeGreaterThan(0);
    }
  });

  it("converts 1-based manifest ranges to zero-based Aseprite frame names", () => {
    expect(animationFrameNames("map-ground-grass")).toEqual([
      "gameplay-atlas 0.aseprite",
      "gameplay-atlas 1.aseprite"
    ]);
    expect(firstFrameName("building-api-gate-flowing")).toBe("gameplay-atlas 36.aseprite");
  });

  it("builds Phaser animation frame configs from atlas frame names", () => {
    expect(animationFrameConfigs("packet-useful")).toEqual([
      { key: GAMEPLAY_ATLAS.key, frame: "gameplay-atlas 74.aseprite" },
      { key: GAMEPLAY_ATLAS.key, frame: "gameplay-atlas 75.aseprite" },
      { key: GAMEPLAY_ATLAS.key, frame: "gameplay-atlas 76.aseprite" },
      { key: GAMEPLAY_ATLAS.key, frame: "gameplay-atlas 77.aseprite" }
    ]);
  });

  it("exposes atlas slices for React HUD icons", () => {
    expect(atlasCssFrame("ui-icon-trust")).toMatchObject({
      imageUrl: GAMEPLAY_ATLAS.imageUrl,
      backgroundPosition: "-360px -504px",
      backgroundSize: "600px 576px",
      width: 24,
      height: 24,
      sheetWidth: 1600,
      sheetHeight: 1536
    });
  });

  it("fails loudly for missing asset ids", () => {
    expect(() => animationFrameNames("missing-asset")).toThrow(
      "Missing gameplay animation missing-asset"
    );
  });
});
