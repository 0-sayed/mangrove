import { describe, expect, it } from "vitest";

import {
  validateBuildIntent,
  validateBuildPadDef,
  validateCommand,
  validateConnectionPreview,
  validateEnemyDef,
  validateHoverState,
  validateLevelConfig,
  validateMapDef,
  validatePathDef,
  validateRangePreview,
  validateSelectionState,
  validateSimEvent,
  validateSimSnapshot,
  validateTowerDef,
  validateWaveDef,
  validateWavePreview
} from "@content/schemas";
import type { BuildPadDef } from "@content/schemas";

const validPathDef = {
  id: "road-main",
  portalId: "incident-portal-1",
  coreId: "service-core",
  points: [
    { x: 0, y: 4 },
    { x: 4, y: 4 },
    { x: 8, y: 6 }
  ],
  length: 12
};

const validBuildPadDef: BuildPadDef = { id: "pad-worker-a", x: 4, y: 3, allowedTowerKinds: ["worker"] };

const validMapDef = {
  id: "map-traffic-surge-contract",
  size: { width: 16, height: 9 },
  paths: [validPathDef],
  buildPads: [
    validBuildPadDef,
    { id: "pad-queue-a", x: 5, y: 5, allowedTowerKinds: ["queue"] },
    { id: "pad-load-balancer-a", x: 7, y: 4, allowedTowerKinds: ["load-balancer"] }
  ],
  portals: [{ id: "incident-portal-1", x: 0, y: 4 }],
  cores: [{ id: "service-core", x: 8, y: 6 }]
};

const validTowerDef = {
  id: "worker-tower",
  kind: "worker",
  displayName: "Worker Tower",
  cost: 30,
  range: 2.5,
  targets: ["ground"],
  combat: { damage: 1, cooldownTicks: 12 },
  softwareShadow: "Consumer capacity"
};

const validEnemyDef = {
  id: "request-runner",
  kind: "request-runner",
  displayName: "Request Runner",
  maxHealth: 3,
  speed: 1,
  leakDamage: 1,
  reward: 2,
  traits: ["normal-request"]
};

const validWaveDef = {
  id: "wave-normal-flow",
  displayName: "Normal Flow",
  preview: {
    enemyKinds: ["request-runner"],
    pressure: "low",
    hint: "Basic traffic follows the main road."
  },
  spawns: [{ tick: 0, enemyId: "request-runner", pathId: "road-main", count: 3, intervalTicks: 20 }],
  budgetReward: 10
};

const validLevelConfig = {
  id: "traffic-surge-contract-fixture",
  mapId: "map-traffic-surge-contract",
  startingState: {
    townHealth: 20,
    buildBudget: 60,
    pressure: 0
  },
  availableTowerIds: ["worker-tower"],
  waves: [validWaveDef],
  recapLaws: [
    {
      id: "law-worker-throughput",
      afterWaveId: "wave-normal-flow",
      text: "Workers turn queued work into completed work, but only within capacity."
    }
  ]
};

describe("TD content and runtime schemas", () => {
  it("accepts valid TD map, path, tower, enemy, wave, and level config", () => {
    expect(validatePathDef(validPathDef).ok).toBe(true);
    expect(validateBuildPadDef(validBuildPadDef).ok).toBe(true);
    expect(validateMapDef(validMapDef).ok).toBe(true);
    expect(validateTowerDef(validTowerDef).ok).toBe(true);
    expect(validateEnemyDef(validEnemyDef).ok).toBe(true);
    expect(validateWaveDef(validWaveDef).ok).toBe(true);
    expect(validateLevelConfig(validLevelConfig).ok).toBe(true);
  });

  it("rejects prototype Message Festival vocabulary", () => {
    expect(validateTowerDef({ ...validTowerDef, kind: ["queue", "hub"].join("-") }).ok).toBe(false);
    expect(
      validateLevelConfig({
        ...validLevelConfig,
        startingState: {
          budget: 50,
          [["tr", "ust"].join("")]: 100,
          [["back", "log"].join("")]: 0,
          [["worker", "Count"].join("")]: 1
        }
      }).ok
    ).toBe(false);
    expect(
      validateCommand({
        type: ["Place", "Building"].join(""),
        buildingId: ["queue", "hub"].join("-"),
        slotId: "slot_queue_1"
      }).ok
    ).toBe(false);
  });

  it("accepts TD commands and rejects removed prototype commands", () => {
    expect(validateCommand({ type: "StartWave", waveId: "wave-normal-flow" }).ok).toBe(true);
    expect(validateCommand({ type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }).ok).toBe(true);
    expect(validateCommand({ type: "SetBuildIntent", towerId: "worker-tower" }).ok).toBe(true);
    expect(validateCommand({ type: "ClearBuildIntent" }).ok).toBe(true);
    expect(validateCommand({ type: "SelectEntity", entityId: "tower-1" }).ok).toBe(true);
    expect(validateCommand({ type: "ClearSelection" }).ok).toBe(true);
    expect(validateCommand({ type: "SetHover", entityId: "pad-worker-a" }).ok).toBe(true);
    expect(validateCommand({ type: "ClearHover" }).ok).toBe(true);
    expect(validateCommand({ type: ["Set", "Worker", "Count"].join(""), count: 2 }).ok).toBe(false);
  });

  it("accepts build, selection, hover, range, connection, and wave preview state", () => {
    expect(validateBuildIntent({ towerId: "worker-tower" }).ok).toBe(true);
    expect(validateSelectionState({ entityId: "tower-1" }).ok).toBe(true);
    expect(validateSelectionState({}).ok).toBe(true);
    expect(validateHoverState({ entityId: "pad-worker-a" }).ok).toBe(true);
    expect(validateHoverState({}).ok).toBe(true);
    expect(validateRangePreview({ towerId: "worker-tower", padId: "pad-worker-a", radius: 2.5 }).ok).toBe(true);
    expect(
      validateConnectionPreview({
        sourceId: "queue-snare",
        targetIds: ["worker-tower"],
        kind: "stall-window"
      }).ok
    ).toBe(true);
    expect(
      validateWavePreview({
        waveId: "wave-normal-flow",
        enemyKinds: ["request-runner"],
        pressure: "low",
        hint: "Basic traffic follows the main road."
      }).ok
    ).toBe(true);
    expect(validateConnectionPreview({ sourceId: "queue-snare", targetIds: [], kind: "stall-window" }).ok).toBe(false);
  });

  it("accepts TD simulator snapshots and events without requiring combat", () => {
    expect(
      validateSimSnapshot({
        tick: 0,
        phase: "setup",
        meters: { townHealth: 20, buildBudget: 60, pressure: 0 },
        towers: [],
        enemies: [],
        projectiles: [],
        alerts: [],
        buildIntent: { towerId: "worker-tower" },
        selection: {},
        hover: {},
        previews: {
          ranges: [{ towerId: "worker-tower", padId: "pad-worker-a", radius: 2.5 }],
          connections: [],
          nextWave: {
            waveId: "wave-normal-flow",
            enemyKinds: ["request-runner"],
            pressure: "low",
            hint: "Basic traffic follows the main road."
          }
        }
      }).ok
    ).toBe(true);

    expect(validateSimEvent({ tick: 0, type: "wave.started", waveId: "wave-normal-flow" }).ok).toBe(true);
    expect(validateSimEvent({ tick: 0, type: "tower.built", towerId: "worker-tower", padId: "pad-worker-a" }).ok).toBe(true);
    expect(validateSimEvent({ tick: 0, type: "build-intent.changed", towerId: "worker-tower" }).ok).toBe(true);
    expect(validateSimEvent({ tick: 0, type: "selection.changed", entityId: "tower-1" }).ok).toBe(true);
    expect(validateSimEvent({ tick: 0, type: "hover.changed", entityId: "pad-worker-a" }).ok).toBe(true);
  });
});
