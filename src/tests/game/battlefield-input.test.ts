import { describe, expect, it } from "vitest";

import {
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs
} from "@content/td-contract-fixture";
import type { LevelConfig, MapDef, SimSnapshot, TowerDef } from "@content/schemas";
import { buildPadCommandForWorldPoint, startNextWaveCommand } from "@game/battlefield-input";
import { buildPadWorldPosition } from "@game/battlefield-view";

const baseSnapshot: SimSnapshot = {
  tick: 0,
  phase: "setup",
  meters: { townHealth: 20, buildBudget: 60, pressure: 0 },
  towers: [],
  enemies: [],
  projectiles: [],
  alerts: [],
  buildIntent: {},
  selection: {},
  hover: {},
  previews: {
    ranges: [],
    connections: [],
    nextWave: {
      waveId: "wave-normal-flow",
      enemyKinds: ["request-runner"],
      pressure: "low",
      hint: "Basic traffic follows the main road."
    }
  }
};

const customMap: MapDef = {
  id: "map-custom-input",
  size: { width: 6, height: 4 },
  paths: [
    {
      id: "road-custom",
      portalId: "portal-custom",
      coreId: "core-custom",
      points: [
        { x: 0, y: 2 },
        { x: 5, y: 2 }
      ],
      length: 5
    }
  ],
  buildPads: [{ id: "pad-custom-worker", x: 2, y: 2, allowedTowerKinds: ["worker"] }],
  portals: [{ id: "portal-custom", x: 0, y: 2 }],
  cores: [{ id: "core-custom", x: 5, y: 2 }]
};

const customLevel: LevelConfig = {
  ...tdContractFixtureLevel,
  id: "custom-input-level",
  mapId: customMap.id,
  availableTowerIds: ["custom-worker-tower"]
};

const customWorkerTower: TowerDef = {
  ...tdContractFixtureTowerDefs[0],
  id: "custom-worker-tower",
  cost: 0
};

function snapshotWith(overrides: Partial<SimSnapshot>): SimSnapshot {
  return {
    ...baseSnapshot,
    meters: overrides.meters ?? baseSnapshot.meters,
    towers: overrides.towers ?? baseSnapshot.towers,
    enemies: overrides.enemies ?? baseSnapshot.enemies,
    projectiles: overrides.projectiles ?? baseSnapshot.projectiles,
    alerts: overrides.alerts ?? baseSnapshot.alerts,
    previews: overrides.previews ?? baseSnapshot.previews,
    ...overrides
  };
}

describe("battlefield input commands", () => {
  it("starts the first authored wave from setup", () => {
    expect(startNextWaveCommand(baseSnapshot)).toEqual({
      type: "StartWave",
      waveId: "wave-normal-flow"
    });
  });

  it("uses the snapshot next-wave preview instead of inferring from activeWaveId", () => {
    expect(
      startNextWaveCommand(
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-one",
          previews: {
            ...baseSnapshot.previews,
            nextWave: {
              waveId: "wave-three",
              enemyKinds: ["request-runner"],
              pressure: "medium",
              hint: "Third authored wave is next after an already completed middle wave."
            }
          }
        })
      )
    ).toEqual({ type: "StartWave", waveId: "wave-three" });
  });

  it("does not start a wave when setup or recap has no next-wave preview", () => {
    expect(
      startNextWaveCommand(
        snapshotWith({
          previews: { ranges: [], connections: [] }
        })
      )
    ).toBe(undefined);
  });

  it("does not start a wave while active or complete", () => {
    expect(startNextWaveCommand(snapshotWith({ phase: "wave" }))).toBe(undefined);
    expect(startNextWaveCommand(snapshotWith({ phase: "complete" }))).toBe(undefined);
  });

  it("maps a setup click on an empty worker pad to BuildTower", () => {
    const point = buildPadWorldPosition(tdContractFixtureMap, "pad-worker-a");

    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        baseSnapshot,
        point
      )
    ).toEqual({ type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" });
  });

  it("maps a recap click on an empty worker pad to BuildTower", () => {
    const point = buildPadWorldPosition(tdContractFixtureMap, "pad-worker-a");

    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        snapshotWith({ phase: "recap" }),
        point
      )
    ).toEqual({ type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" });
  });

  it("does not map build pad clicks during a wave, on occupied pads, or below cost", () => {
    const point = buildPadWorldPosition(tdContractFixtureMap, "pad-worker-a");

    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        snapshotWith({ phase: "wave" }),
        point
      )
    ).toBe(undefined);
    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        snapshotWith({
          towers: [
            {
              id: "worker-tower@pad-worker-a#0",
              towerId: "worker-tower",
              padId: "pad-worker-a",
              cooldownRemainingTicks: 0
            }
          ]
        }),
        point
      )
    ).toBe(undefined);
    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        snapshotWith({ meters: { ...baseSnapshot.meters, buildBudget: 29 } }),
        point
      )
    ).toBe(undefined);
  });

  it("filters build commands by tower kind and level availability", () => {
    const point = buildPadWorldPosition(customMap, "pad-custom-worker");

    expect(
      buildPadCommandForWorldPoint(
        customLevel,
        customMap,
        [{ ...customWorkerTower, kind: "queue" }],
        baseSnapshot,
        point
      )
    ).toBe(undefined);
    expect(
      buildPadCommandForWorldPoint(
        { ...customLevel, availableTowerIds: [] },
        customMap,
        [customWorkerTower],
        baseSnapshot,
        point
      )
    ).toBe(undefined);
  });

  it("does not map clicks just outside the pad hitbox", () => {
    const point = buildPadWorldPosition(tdContractFixtureMap, "pad-worker-a");

    expect(
      buildPadCommandForWorldPoint(
        tdContractFixtureLevel,
        tdContractFixtureMap,
        tdContractFixtureTowerDefs,
        baseSnapshot,
        { x: point.x + 44, y: point.y }
      )
    ).toBe(undefined);
  });
});
