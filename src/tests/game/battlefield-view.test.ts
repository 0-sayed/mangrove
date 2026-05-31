import { describe, expect, it } from "vitest";

import { tdContractFixtureMap } from "@content/td-contract-fixture";
import type { MapDef, SimSnapshot } from "@content/schemas";
import {
  activeEnemySprites,
  BATTLEFIELD_VIEW,
  battlefieldTowers,
  buildPadWorldPosition,
  pathWorldPoints,
  towerBodyAnimationId
} from "@game/battlefield-view";

const snapshot: SimSnapshot = {
  tick: 24,
  phase: "wave",
  meters: {
    townHealth: 20,
    buildBudget: 30,
    pressure: 0
  },
  towers: [
    {
      id: "worker-tower@pad-worker-a#0",
      towerId: "worker-tower",
      padId: "pad-worker-a",
      cooldownRemainingTicks: 0
    }
  ],
  enemies: [
    {
      id: "enemy-1",
      enemyId: "request-runner",
      pathId: "road-main",
      progress: 0.5,
      health: 3,
      status: "active"
    },
    {
      id: "enemy-2",
      enemyId: "request-runner",
      pathId: "road-main",
      progress: 1,
      health: 0,
      status: "resolved"
    }
  ],
  projectiles: [],
  alerts: [],
  buildIntent: {},
  selection: {},
  hover: {},
  previews: { ranges: [], connections: [] },
  activeWaveId: "wave-normal-flow"
};

const shortPathMap: MapDef = {
  id: "short-map",
  size: { width: 4, height: 3 },
  paths: [
    {
      id: "road-short",
      portalId: "portal-1",
      coreId: "core-1",
      points: [
        { x: 1, y: 2 },
        { x: 3, y: 2 }
      ],
      length: 2
    }
  ],
  buildPads: [],
  portals: [{ id: "portal-1", x: 1, y: 2 }],
  cores: [{ id: "core-1", x: 3, y: 2 }]
};

describe("battlefield view model", () => {
  it("maps authored path points to world points", () => {
    expect(pathWorldPoints(tdContractFixtureMap, "road-main")).toEqual([
      { x: 150, y: 298 },
      { x: 438, y: 298 },
      { x: 726, y: 442 }
    ]);
  });

  it("accepts schema-valid paths with two visible points", () => {
    expect(pathWorldPoints(shortPathMap, "road-short")).toEqual([
      { x: 222, y: 154 },
      { x: 366, y: 154 }
    ]);
  });

  it("maps build pads to world positions", () => {
    expect(buildPadWorldPosition(tdContractFixtureMap, "pad-worker-a")).toEqual({
      x: BATTLEFIELD_VIEW.originX + 4 * BATTLEFIELD_VIEW.tileSize,
      y: BATTLEFIELD_VIEW.originY + 3 * BATTLEFIELD_VIEW.tileSize
    });
  });

  it("uses snapshot towers as the battlefield render source", () => {
    expect(battlefieldTowers(snapshot).map((tower) => tower.towerId)).toEqual(["worker-tower"]);
  });

  it("maps worker towers to the worker tower body asset", () => {
    expect(towerBodyAnimationId({ kind: "worker" })).toBe("building-worker-tower-idle");
  });

  it("keeps active enemy sprite rendering empty for TD001", () => {
    expect(activeEnemySprites()).toEqual([]);
  });
});
