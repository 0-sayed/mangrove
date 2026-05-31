import { describe, expect, it } from "vitest";

import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs,
  workerTowerDef
} from "@content/td-contract-fixture";
import type { Command, LevelConfig, TowerDef, WaveDef } from "@content/schemas";
import { validateSimSnapshot } from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

function createFixtureGame(config: LevelConfig = tdContractFixtureLevel) {
  return createGame(config, 123, {
    towerDefs: tdContractFixtureTowerDefs,
    enemyDefs: tdContractFixtureEnemyDefs,
    map: tdContractFixtureMap
  });
}

function advance(state: GameState, ticks: number): GameState {
  let current = state;

  for (let index = 0; index < ticks; index += 1) {
    current = step(current);
  }

  return current;
}

function createTwoWaveConfig(): LevelConfig {
  const firstWave = tdContractFixtureLevel.waves[0];

  if (!firstWave) {
    throw new Error("Expected TD fixture to include a wave.");
  }

  const followUpWave: WaveDef = {
    ...firstWave,
    id: "wave-follow-up",
    displayName: "Follow Up"
  };

  return {
    ...tdContractFixtureLevel,
    waves: [firstWave, followUpWave]
  };
}

describe("TD simulator core", () => {
  it("creates setup state from TD level starting state", () => {
    const state = createFixtureGame();
    const snapshot = toSnapshot(state);

    expect(snapshot).toEqual({
      tick: 0,
      phase: "setup",
      meters: {
        townHealth: 20,
        buildBudget: 60,
        pressure: 0
      },
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
    });
    expect(validateSimSnapshot(snapshot).ok).toBe(true);
  });

  it("clones config, map, tower defs, and enemy defs when creating a game", () => {
    const config = {
      ...tdContractFixtureLevel,
      startingState: { ...tdContractFixtureLevel.startingState },
      availableTowerIds: [...tdContractFixtureLevel.availableTowerIds],
      waves: tdContractFixtureLevel.waves.map((wave) => ({
        ...wave,
        preview: { ...wave.preview, enemyKinds: [...wave.preview.enemyKinds] },
        spawns: wave.spawns.map((spawn) => ({ ...spawn }))
      })),
      recapLaws: tdContractFixtureLevel.recapLaws.map((law) => ({ ...law }))
    };
    const map = {
      ...tdContractFixtureMap,
      buildPads: tdContractFixtureMap.buildPads.map((pad) => ({
        ...pad,
        allowedTowerKinds: [...pad.allowedTowerKinds]
      })),
      paths: tdContractFixtureMap.paths.map((path) => ({
        ...path,
        points: path.points.map((point) => ({ ...point }))
      })),
      portals: tdContractFixtureMap.portals.map((portal) => ({ ...portal })),
      cores: tdContractFixtureMap.cores.map((core) => ({ ...core }))
    };
    const towerDefs = tdContractFixtureTowerDefs.map((tower) => ({
      ...tower,
      targets: [...tower.targets],
      combat: { ...tower.combat }
    }));
    const enemyDefs = tdContractFixtureEnemyDefs.map((enemy) => ({
      ...enemy,
      traits: [...enemy.traits]
    }));

    const state = createGame(config, 123, { towerDefs, enemyDefs, map });
    const firstPad = map.buildPads[0];
    const firstTowerDef = towerDefs[0];
    const firstEnemyDef = enemyDefs[0];

    if (!firstPad || !firstTowerDef || !firstEnemyDef) {
      throw new Error("Expected TD fixture clones.");
    }

    config.startingState.buildBudget = 999;
    firstPad.allowedTowerKinds.length = 0;
    firstTowerDef.combat.damage = 999;
    firstEnemyDef.traits.push("mutated");

    expect(state.meters.buildBudget).toBe(60);
    expect(state.map?.buildPads[0]?.allowedTowerKinds).toEqual(["worker"]);
    expect(state.towerDefsById["worker-tower"]?.combat.damage).toBe(1);
    expect(state.enemyDefsById["request-runner"]?.traits).toEqual(["normal-request"]);
  });

  it("returns snapshot objects that cannot mutate simulator state", () => {
    const built = step(createFixtureGame(), [{ type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }]);
    const snapshot = toSnapshot(built);
    const snapshotTower = snapshot.towers[0];

    if (!snapshotTower) {
      throw new Error("Expected a snapshot tower.");
    }

    snapshotTower.cooldownRemainingTicks = 99;

    expect(built.towers[0]?.cooldownRemainingTicks).toBe(0);
    expect(toSnapshot(built).towers[0]?.cooldownRemainingTicks).toBe(0);
    expect(toSnapshot(built)).not.toBe(built);
  });

  it("advances one fixed tick, records command.received, and clones command history", () => {
    const command: Command = { type: "SetBuildIntent", towerId: "worker-tower" };
    const initial = createFixtureGame();
    const next = step(initial, [command]);

    command.towerId = "mutated-after-step";

    expect(next.tick).toBe(1);
    expect(initial.commandHistory).toEqual([]);
    expect(next.commandHistory).toEqual([
      { tick: 0, command: { type: "SetBuildIntent", towerId: "worker-tower" } }
    ]);
    expect(next.commandHistory[0]?.command).not.toBe(command);
    expect(next.eventLog.events).toContainEqual({
      tick: 0,
      type: "command.received",
      commandType: "SetBuildIntent"
    });
  });

  it("applies TD build, intent, selection, hover, and clear commands", () => {
    const next = step(createFixtureGame(), [
      { type: "SetBuildIntent", towerId: "worker-tower" },
      { type: "SelectEntity", entityId: "pad-worker-a" },
      { type: "SetHover", entityId: "pad-worker-a" },
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
      { type: "ClearSelection" },
      { type: "ClearHover" },
      { type: "ClearBuildIntent" }
    ]);

    expect(next.meters.buildBudget).toBe(60 - workerTowerDef.cost);
    expect(next.towers).toEqual([
      {
        id: "worker-tower@pad-worker-a#0",
        towerId: "worker-tower",
        padId: "pad-worker-a",
        cooldownRemainingTicks: 0
      }
    ]);
    expect(next.buildIntent).toEqual({});
    expect(next.selection).toEqual({});
    expect(next.hover).toEqual({});
    expect(next.eventLog.events).toContainEqual({
      tick: 0,
      type: "tower.built",
      towerId: "worker-tower",
      padId: "pad-worker-a"
    });
  });

  it("rejects invalid BuildTower commands without spending budget", () => {
    const unavailableTower = {
      ...workerTowerDef,
      id: "queue-tower",
      kind: "queue"
    } satisfies TowerDef;
    const withUnavailableTowerDef = createGame(tdContractFixtureLevel, 123, {
      towerDefs: [...tdContractFixtureTowerDefs, unavailableTower],
      enemyDefs: tdContractFixtureEnemyDefs,
      map: tdContractFixtureMap
    });
    const unavailable = step(withUnavailableTowerDef, [
      { type: "BuildTower", towerId: unavailableTower.id, padId: "pad-queue-a" }
    ]);
    const invalidPadKind = step(createFixtureGame(), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-queue-a" }
    ]);
    const occupiedPad = step(createFixtureGame(), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }
    ]);
    const lowBudgetConfig: LevelConfig = {
      ...tdContractFixtureLevel,
      startingState: { ...tdContractFixtureLevel.startingState, buildBudget: workerTowerDef.cost - 1 }
    };
    const insufficientBudget = step(createFixtureGame(lowBudgetConfig), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }
    ]);

    expect(unavailable.towers).toEqual([]);
    expect(unavailable.meters.buildBudget).toBe(60);
    expect(invalidPadKind.towers).toEqual([]);
    expect(invalidPadKind.meters.buildBudget).toBe(60);
    expect(occupiedPad.towers).toHaveLength(1);
    expect(occupiedPad.meters.buildBudget).toBe(60 - workerTowerDef.cost);
    expect(insufficientBudget.towers).toEqual([]);
    expect(insufficientBudget.meters.buildBudget).toBe(workerTowerDef.cost - 1);
    expect(
      [...unavailable.eventLog.events, ...invalidPadKind.eventLog.events, ...insufficientBudget.eventLog.events]
    ).not.toContainEqual(expect.objectContaining({ type: "tower.built" }));
  });

  it("allows building towers during recap between waves", () => {
    const twoWaveConfig = createTwoWaveConfig();
    const started = step(createFixtureGame(twoWaveConfig), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const recap = advance(started, 41);
    const built = step(recap, [{ type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }]);

    expect(recap.phase).toBe("recap");
    expect(built.towers).toHaveLength(1);
    expect(built.meters.buildBudget).toBe(recap.meters.buildBudget - workerTowerDef.cost);
    expect(built.eventLog.events).toContainEqual({
      tick: recap.tick,
      type: "tower.built",
      towerId: "worker-tower",
      padId: "pad-worker-a"
    });
  });

  it("credits wave budget rewards when waves complete", () => {
    const twoWaveConfig = createTwoWaveConfig();
    const rewardedWave = twoWaveConfig.waves[0];

    if (!rewardedWave) {
      throw new Error("Expected two-wave fixture to include a rewarded wave.");
    }

    const started = step(createFixtureGame(twoWaveConfig), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const recap = advance(started, 41);

    expect(recap.phase).toBe("recap");
    expect(recap.meters.buildBudget).toBe(tdContractFixtureLevel.startingState.buildBudget + rewardedWave.budgetReward);
  });

  it("exposes range previews for the current build intent", () => {
    const state = step(createFixtureGame(), [{ type: "SetBuildIntent", towerId: "worker-tower" }]);

    expect(toSnapshot(state).previews.ranges).toEqual([
      { towerId: "worker-tower", padId: "pad-worker-a", radius: workerTowerDef.range }
    ]);
  });

  it("ends contract-only final waves after the final expanded spawn tick", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const atFinalSpawnTick = advance(started, 39);
    const afterFinalSpawnTick = step(atFinalSpawnTick);
    const completed = step(afterFinalSpawnTick);

    expect(started.phase).toBe("wave");
    expect(atFinalSpawnTick.tick).toBe(40);
    expect(atFinalSpawnTick.phase).toBe("wave");
    expect(afterFinalSpawnTick.tick).toBe(41);
    expect(afterFinalSpawnTick.phase).toBe("wave");
    expect(completed.phase).toBe("complete");
    expect(completed.tick).toBe(42);
    expect(completed.completedWaveIds).toEqual(["wave-normal-flow"]);
    expect(completed.activeWaveId).toBeUndefined();
    expect(completed.eventLog.events).toContainEqual({
      tick: 41,
      type: "wave.ended",
      waveId: "wave-normal-flow"
    });
  });
});
