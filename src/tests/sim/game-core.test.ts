import { describe, expect, it } from "vitest";

import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs,
  workerTowerDef
} from "@content/td-contract-fixture";
import type { Command, EnemyDef, LevelConfig, MapDef, TowerDef, WaveDef } from "@content/schemas";
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

function createDecimalMovementGame() {
  const map: MapDef = {
    ...tdContractFixtureMap,
    paths: tdContractFixtureMap.paths.map((path) => ({ ...path, length: 1 }))
  };
  const enemyDefs: readonly EnemyDef[] = tdContractFixtureEnemyDefs.map((enemy) => ({
    ...enemy,
    speed: 0.1
  }));

  return createGame(tdContractFixtureLevel, 123, {
    towerDefs: tdContractFixtureTowerDefs,
    enemyDefs,
    map
  });
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
    const recap = advance(started, 52);
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
    const recap = advance(started, 52);

    expect(recap.phase).toBe("recap");
    expect(recap.meters.buildBudget).toBe(tdContractFixtureLevel.startingState.buildBudget + rewardedWave.budgetReward);
  });

  it("spawns enemies from the active wave schedule with deterministic ids", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const beforeSecondSpawn = advance(started, 19);
    const afterSecondSpawn = step(beforeSecondSpawn);

    expect(started.enemies).toEqual([
      {
        id: "enemy:wave-normal-flow:0:0",
        enemyId: "request-runner",
        pathId: "road-main",
        progress: 0,
        health: 3,
        status: "active"
      }
    ]);
    expect(beforeSecondSpawn.enemies).toHaveLength(0);
    expect(afterSecondSpawn.enemies.map((enemy) => enemy.id)).toEqual([
      "enemy:wave-normal-flow:0:1"
    ]);
    expect(started.eventLog.events).toContainEqual({
      tick: 0,
      type: "enemy.spawned",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      waveId: "wave-normal-flow",
      pathId: "road-main"
    });
  });

  it("moves active enemies by speed over path length each tick", () => {
    const spawned = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const moved = step(spawned);

    expect(spawned.enemies[0]?.progress).toBe(0);
    expect(moved.enemies[0]?.progress).toBeCloseTo(1 / 12, 6);
  });

  it("leaks enemies at path end and applies town health damage", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const afterLeak = advance(started, 12);

    expect(afterLeak.enemies).not.toContainEqual(
      expect.objectContaining({ id: "enemy:wave-normal-flow:0:0" })
    );
    expect(afterLeak.meters.townHealth).toBe(19);
    expect(afterLeak.eventLog.events).toContainEqual({
      tick: 12,
      type: "enemy.leaked",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      waveId: "wave-normal-flow",
      pathId: "road-main",
      leakDamage: 1
    });
  });

  it("leaks enemies on schedule when decimal movement lands on the path end", () => {
    const started = step(createDecimalMovementGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const afterLeak = advance(started, 10);

    expect(afterLeak.enemies).not.toContainEqual(
      expect.objectContaining({ id: "enemy:wave-normal-flow:0:0" })
    );
    expect(afterLeak.meters.townHealth).toBe(19);
    expect(afterLeak.eventLog.events).toContainEqual(
      expect.objectContaining({
        tick: 10,
        type: "enemy.leaked",
        enemyInstanceId: "enemy:wave-normal-flow:0:0"
      })
    );
  });

  it("derives pressure from active enemies and near leaks", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const active = advance(started, 2);
    const nearLeak = advance(started, 11);

    expect(active.meters.pressure).toBe(1);
    expect(nearLeak.meters.pressure).toBe(3);
    expect(toSnapshot(nearLeak).meters.pressure).toBe(3);
  });

  it("resets pressure when the wave has no active enemies", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const completed = advance(started, 52);

    expect(completed.phase).toBe("complete");
    expect(completed.meters.pressure).toBe(0);
  });

  it("exposes range previews for the current build intent", () => {
    const state = step(createFixtureGame(), [{ type: "SetBuildIntent", towerId: "worker-tower" }]);

    expect(toSnapshot(state).previews.ranges).toEqual([
      { towerId: "worker-tower", padId: "pad-worker-a", radius: workerTowerDef.range }
    ]);
  });

  it("keeps waves active until final scheduled enemies have leaked", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const afterFinalSpawn = advance(started, 40);
    const completed = advance(afterFinalSpawn, 12);

    expect(afterFinalSpawn.phase).toBe("wave");
    expect(afterFinalSpawn.enemies.map((enemy) => enemy.id)).toContain("enemy:wave-normal-flow:0:2");
    expect(completed.phase).toBe("complete");
    expect(completed.completedWaveIds).toEqual(["wave-normal-flow"]);
    expect(completed.activeWaveId).toBeUndefined();
    expect(completed.meters.buildBudget).toBe(70);
    expect(completed.meters.townHealth).toBe(17);
    expect(completed.eventLog.events).toContainEqual({
      tick: completed.tick - 1,
      type: "wave.ended",
      waveId: "wave-normal-flow"
    });
  });
});
