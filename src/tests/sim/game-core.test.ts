import { describe, expect, it } from "vitest";

import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs,
  workerTowerDef
} from "@content/td-contract-fixture";
import {
  trafficSurgeEnemyDefs,
  trafficSurgeLevel,
  trafficSurgeMap,
  trafficSurgeTowerDefs
} from "@content/traffic-surge-level";
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

function eventTypes(state: GameState): Set<string> {
  return new Set(state.eventLog.events.map((event) => event.type));
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
    const built = step(createFixtureGame(), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }
    ]);
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
      startingState: {
        ...tdContractFixtureLevel.startingState,
        buildBudget: workerTowerDef.cost - 1
      }
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
    expect([
      ...unavailable.eventLog.events,
      ...invalidPadKind.eventLog.events,
      ...insufficientBudget.eventLog.events
    ]).not.toContainEqual(expect.objectContaining({ type: "tower.built" }));
  });

  it("allows building towers during recap between waves", () => {
    const twoWaveConfig = createTwoWaveConfig();
    const started = step(createFixtureGame(twoWaveConfig), [
      { type: "StartWave", waveId: "wave-normal-flow" }
    ]);
    const recap = advance(started, 52);
    const built = step(recap, [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }
    ]);

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

    const started = step(createFixtureGame(twoWaveConfig), [
      { type: "StartWave", waveId: "wave-normal-flow" }
    ]);
    const recap = advance(started, 52);

    expect(recap.phase).toBe("recap");
    expect(recap.meters.buildBudget).toBe(
      tdContractFixtureLevel.startingState.buildBudget + rewardedWave.budgetReward
    );
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
        progress: 1 / 12,
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

    expect(spawned.enemies[0]?.progress).toBeCloseTo(1 / 12, 6);
    expect(moved.enemies[0]?.progress).toBeCloseTo(2 / 12, 6);
  });

  it("worker towers damage active enemies in range and emit projectile events", () => {
    const started = step(createFixtureGame(), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
      { type: "StartWave", waveId: "wave-normal-flow" }
    ]);
    const fired = advance(started, 2);

    expect(fired.enemies[0]).toMatchObject({
      id: "enemy:wave-normal-flow:0:0",
      health: 2,
      status: "active"
    });
    expect(fired.towers[0]?.cooldownRemainingTicks).toBe(workerTowerDef.combat.cooldownTicks);
    expect(fired.projectiles).toEqual([
      {
        id: "projectile:2:worker-tower@pad-worker-a#0:enemy:wave-normal-flow:0:0",
        towerInstanceId: "worker-tower@pad-worker-a#0",
        enemyInstanceId: "enemy:wave-normal-flow:0:0",
        progress: 1
      }
    ]);
    expect(fired.eventLog.events).toContainEqual({
      tick: 2,
      type: "tower.fired",
      towerInstanceId: "worker-tower@pad-worker-a#0",
      towerId: "worker-tower",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      damage: 1,
      projectileId: "projectile:2:worker-tower@pad-worker-a#0:enemy:wave-normal-flow:0:0"
    });
  });

  it("clears projectile output on the tick after worker towers fire", () => {
    const started = step(createFixtureGame(), [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
      { type: "StartWave", waveId: "wave-normal-flow" }
    ]);
    const fired = advance(started, 2);
    const next = step(fired);

    expect(fired.projectiles).toHaveLength(1);
    expect(next.projectiles).toEqual([]);
    expect(toSnapshot(next).projectiles).toEqual([]);
  });

  it("resolves enemies, credits enemy rewards, and prevents resolved enemies from leaking", () => {
    const enemyDefs: readonly EnemyDef[] = tdContractFixtureEnemyDefs.map((enemy) => ({
      ...enemy,
      maxHealth: 1
    }));
    const started = step(
      createGame(tdContractFixtureLevel, 123, {
        towerDefs: tdContractFixtureTowerDefs,
        enemyDefs,
        map: tdContractFixtureMap
      }),
      [
        { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
        { type: "StartWave", waveId: "wave-normal-flow" }
      ]
    );
    const resolved = advance(started, 2);

    expect(resolved.enemies).toEqual([]);
    expect(resolved.meters.buildBudget).toBe(60 - workerTowerDef.cost + 2);
    expect(resolved.meters.townHealth).toBe(20);
    expect(resolved.eventLog.events).toContainEqual({
      tick: 2,
      type: "enemy.resolved",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      waveId: "wave-normal-flow",
      pathId: "road-main",
      reward: 2
    });
  });

  it("queue snares hold enemies for a fixed stall window before movement resumes", () => {
    const started = step(
      createGame(trafficSurgeLevel, 123, {
        towerDefs: trafficSurgeTowerDefs,
        enemyDefs: trafficSurgeEnemyDefs,
        map: trafficSurgeMap
      }),
      [
        { type: "BuildTower", towerId: "queue-snare", padId: "pad-queue-a" },
        { type: "StartWave", waveId: "wave-normal-flow" }
      ]
    );
    let beforeStall = started;
    let stalled = step(beforeStall);
    for (let tick = 0; tick < 80 && !eventTypes(stalled).has("enemy.stalled"); tick += 1) {
      beforeStall = stalled;
      stalled = step(beforeStall);
    }
    const stalledProgress = stalled.enemies[0]?.progress;

    expect(eventTypes(stalled).has("enemy.stalled")).toBe(true);
    expect(stalled.enemies[0]).toMatchObject({
      id: "enemy:wave-normal-flow:0:0",
      stallRemainingTicks: 5
    });
    expect(stalledProgress).toBe(beforeStall.enemies[0]?.progress);
    expect(stalled.eventLog.events).toContainEqual({
      tick: stalled.tick - 1,
      type: "enemy.stalled",
      towerInstanceId: "queue-snare@pad-queue-a#0",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      durationTicks: 6
    });

    const stillStalled = step(stalled);
    expect(stillStalled.enemies[0]).toMatchObject({
      id: "enemy:wave-normal-flow:0:0",
      progress: stalledProgress,
      stallRemainingTicks: 4
    });

    const released = advance(stalled, 5);
    const moved = step(released);

    expect(released.enemies[0]).not.toHaveProperty("stallRemainingTicks");
    expect(released.enemies[0]?.progress).toBe(stalledProgress);
    expect(moved.enemies[0]?.progress).toBeGreaterThan(stalledProgress ?? 0);
    expect(moved.enemies[0]).not.toHaveProperty("stallRemainingTicks");
  });

  it("reports queue overload when stalled enemies reach queue capacity", () => {
    const rapidBurstLevel: LevelConfig = {
      ...trafficSurgeLevel,
      waves: [
        {
          id: "wave-rapid-burst",
          displayName: "Rapid Burst",
          preview: {
            enemyKinds: ["burst-swarm"],
            pressure: "medium",
            hint: "Burst traffic tests queue capacity."
          },
          spawns: [{ tick: 0, enemyId: "burst-swarm", pathId: "road-main", count: 4, intervalTicks: 1 }],
          budgetReward: 0
        }
      ]
    };
    const fastQueueTowerDefs: readonly TowerDef[] = trafficSurgeTowerDefs.map((towerDef) =>
      towerDef.id === "queue-snare"
        ? { ...towerDef, range: 99, combat: { ...towerDef.combat, cooldownTicks: 1 } }
        : towerDef
    );
    const started = step(
      createGame(rapidBurstLevel, 123, {
        towerDefs: fastQueueTowerDefs,
        enemyDefs: trafficSurgeEnemyDefs,
        map: trafficSurgeMap
      }),
      [
        { type: "BuildTower", towerId: "queue-snare", padId: "pad-queue-a" },
        { type: "StartWave", waveId: "wave-rapid-burst" }
      ]
    );
    const overloaded = advance(started, 2);
    const snapshot = toSnapshot(overloaded);

    expect(overloaded.enemies.filter((enemy) => (enemy.stallRemainingTicks ?? 0) > 0)).toHaveLength(3);
    expect(snapshot.previews.connections).toContainEqual({
      sourceId: "queue-snare@pad-queue-a#0",
      targetIds: ["road-main", "road-relief"],
      kind: "overload-warning"
    });
    expect(snapshot.alerts).toContain("overload:queue-snare@pad-queue-a#0");
  });

  it("load balancer gates route new enemies toward healthier downstream coverage", () => {
    const hotShardWave = trafficSurgeLevel.waves.find((wave) => wave.id === "wave-hot-shard");

    if (!hotShardWave) {
      throw new Error("Expected traffic surge fixture to include wave-hot-shard.");
    }

    const routingMap: MapDef = {
      ...trafficSurgeMap,
      buildPads: [
        ...trafficSurgeMap.buildPads,
        { id: "pad-worker-relief", x: 9, y: 8, allowedTowerKinds: ["worker"] }
      ]
    };
    const routingLevel: LevelConfig = {
      ...trafficSurgeLevel,
      startingState: { ...trafficSurgeLevel.startingState, buildBudget: 120 },
      waves: [hotShardWave]
    };
    const routed = step(
      createGame(routingLevel, 123, {
        towerDefs: trafficSurgeTowerDefs,
        enemyDefs: trafficSurgeEnemyDefs,
        map: routingMap
      }),
      [
        { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-relief" },
        { type: "BuildTower", towerId: "load-balancer-gate", padId: "pad-load-balancer-a" },
        { type: "StartWave", waveId: "wave-hot-shard" }
      ]
    );

    expect(routed.enemies[0]).toMatchObject({
      id: "enemy:wave-hot-shard:0:0",
      enemyId: "heavy-payload",
      pathId: "road-relief"
    });
    expect(routed.eventLog.events).toContainEqual({
      tick: 0,
      type: "enemy.routed",
      towerInstanceId: "load-balancer-gate@pad-load-balancer-a#1",
      enemyInstanceId: "enemy:wave-hot-shard:0:0",
      enemyId: "heavy-payload",
      waveId: "wave-hot-shard",
      fromPathId: "road-main",
      toPathId: "road-relief",
      reason: "healthier-coverage"
    });
    expect(toSnapshot(routed).previews.connections).toContainEqual({
      sourceId: "load-balancer-gate@pad-load-balancer-a#1",
      targetIds: ["road-main", "road-relief"],
      kind: "route-influence"
    });
  });

  it("load balancer routing scores later same-tick spawns against earlier same-tick enemies", () => {
    const routingMap: MapDef = {
      ...trafficSurgeMap,
      buildPads: [
        ...trafficSurgeMap.buildPads,
        { id: "pad-worker-relief", x: 9, y: 8, allowedTowerKinds: ["worker"] }
      ]
    };
    const sameTickWave: WaveDef = {
      id: "wave-same-tick-routing",
      displayName: "Same Tick Routing",
      preview: {
        enemyKinds: ["heavy-payload"],
        pressure: "high",
        hint: "A burst tests same-tick route pressure."
      },
      spawns: Array.from({ length: 10 }, () => ({
        tick: 0,
        enemyId: "heavy-payload",
        pathId: "road-main",
        count: 1,
        intervalTicks: 1
      })),
      budgetReward: 0
    };
    const routingLevel: LevelConfig = {
      ...trafficSurgeLevel,
      startingState: { ...trafficSurgeLevel.startingState, buildBudget: 120 },
      waves: [sameTickWave]
    };
    const routed = step(
      createGame(routingLevel, 123, {
        towerDefs: trafficSurgeTowerDefs,
        enemyDefs: trafficSurgeEnemyDefs,
        map: routingMap
      }),
      [
        { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-relief" },
        { type: "BuildTower", towerId: "load-balancer-gate", padId: "pad-load-balancer-a" },
        { type: "StartWave", waveId: "wave-same-tick-routing" }
      ]
    );

    expect(routed.enemies.map((enemy) => enemy.pathId)).toEqual([
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-relief",
      "road-main"
    ]);
  });

  it("load balancer routing keeps authored relief path when route coverage scores tie", () => {
    const tieWave: WaveDef = {
      id: "wave-tie-routing",
      displayName: "Tie Routing",
      preview: {
        enemyKinds: ["heavy-payload"],
        pressure: "low",
        hint: "Equal coverage should keep authored routing."
      },
      spawns: [{ tick: 0, enemyId: "heavy-payload", pathId: "road-relief", count: 1, intervalTicks: 1 }],
      budgetReward: 0
    };
    const tieLevel: LevelConfig = {
      ...trafficSurgeLevel,
      waves: [tieWave]
    };
    const tied = step(
      createGame(tieLevel, 123, {
        towerDefs: trafficSurgeTowerDefs,
        enemyDefs: trafficSurgeEnemyDefs,
        map: trafficSurgeMap
      }),
      [
        { type: "BuildTower", towerId: "load-balancer-gate", padId: "pad-load-balancer-a" },
        { type: "StartWave", waveId: "wave-tie-routing" }
      ]
    );

    expect(tied.enemies[0]).toMatchObject({
      id: "enemy:wave-tie-routing:0:0",
      enemyId: "heavy-payload",
      pathId: "road-relief"
    });
    expect(tied.eventLog.events).not.toContainEqual(expect.objectContaining({ type: "enemy.routed" }));
  });

  it("leaks enemies at path end and applies town health damage", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const afterLeak = advance(started, 12);

    expect(afterLeak.enemies).not.toContainEqual(
      expect.objectContaining({ id: "enemy:wave-normal-flow:0:0" })
    );
    expect(afterLeak.meters.townHealth).toBe(19);
    expect(afterLeak.eventLog.events).toContainEqual({
      tick: 11,
      type: "enemy.leaked",
      enemyInstanceId: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      waveId: "wave-normal-flow",
      pathId: "road-main",
      leakDamage: 1
    });
  });

  it("leaks enemies on schedule when decimal movement lands on the path end", () => {
    const started = step(createDecimalMovementGame(), [
      { type: "StartWave", waveId: "wave-normal-flow" }
    ]);
    const afterLeak = advance(started, 10);

    expect(afterLeak.enemies).not.toContainEqual(
      expect.objectContaining({ id: "enemy:wave-normal-flow:0:0" })
    );
    expect(afterLeak.meters.townHealth).toBe(19);
    expect(afterLeak.eventLog.events).toContainEqual(
      expect.objectContaining({
        tick: 9,
        type: "enemy.leaked",
        enemyInstanceId: "enemy:wave-normal-flow:0:0"
      })
    );
  });

  it("derives pressure from active enemies and near leaks", () => {
    const started = step(createFixtureGame(), [{ type: "StartWave", waveId: "wave-normal-flow" }]);
    const active = advance(started, 2);
    const nearLeak = advance(started, 8);

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
    const completed = advance(afterFinalSpawn, 11);

    expect(afterFinalSpawn.phase).toBe("wave");
    expect(afterFinalSpawn.enemies.map((enemy) => enemy.id)).toContain(
      "enemy:wave-normal-flow:0:2"
    );
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
