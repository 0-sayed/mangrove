import { describe, expect, it } from "vitest";

import { bootstrapLevel } from "@content/bootstrap-level";
import {
  loadBalancerGateDef,
  queueSnareDef,
  trafficSurgeEnemyDefs,
  trafficSurgeLevel,
  trafficSurgeMap,
  trafficSurgeTowerDefs,
  workerTowerDef
} from "@content/traffic-surge-level";
import { validateEnemyDef, validateLevelConfig, validateMapDef, validateTowerDef } from "@content/schemas";

describe("Traffic Surge At The Gate content", () => {
  it("is the active bootstrap level and passes runtime validators", () => {
    expect(bootstrapLevel).toBe(trafficSurgeLevel);
    expect(validateLevelConfig(trafficSurgeLevel).ok).toBe(true);
    expect(validateMapDef(trafficSurgeMap).ok).toBe(true);

    for (const towerDef of trafficSurgeTowerDefs) {
      expect(validateTowerDef(towerDef).ok).toBe(true);
    }

    for (const enemyDef of trafficSurgeEnemyDefs) {
      expect(validateEnemyDef(enemyDef).ok).toBe(true);
    }
  });

  it("covers the TD004 authored content contract", () => {
    expect(trafficSurgeLevel.id).toBe("traffic-surge-at-the-gate");
    expect(trafficSurgeMap.portals).toEqual([{ id: "incident-portal-1", x: 0, y: 5 }]);
    expect(trafficSurgeMap.cores).toEqual([{ id: "service-core", x: 15, y: 6 }]);
    expect(trafficSurgeMap.paths.map((path) => path.id)).toEqual(["road-main", "road-relief"]);
    expect(trafficSurgeMap.buildPads).toEqual([
      { id: "pad-worker-a", x: 4, y: 2, allowedTowerKinds: ["worker"] },
      { id: "pad-queue-a", x: 5, y: 4, allowedTowerKinds: ["queue"] },
      { id: "pad-load-balancer-a", x: 8, y: 5, allowedTowerKinds: ["load-balancer"] }
    ]);

    expect(trafficSurgeTowerDefs.map((tower) => tower.displayName)).toEqual([
      "Worker Tower",
      "Queue Snare",
      "Load Balancer Gate"
    ]);
    expect(trafficSurgeEnemyDefs.map((enemy) => enemy.displayName)).toEqual([
      "Request Runner",
      "Burst Swarm",
      "Heavy Payload"
    ]);
    expect(trafficSurgeLevel.waves.map((wave) => wave.displayName)).toEqual([
      "Normal Flow",
      "Burst Surge",
      "Hot Shard"
    ]);
    expect(trafficSurgeLevel.recapLaws.map((law) => law.afterWaveId)).toEqual([
      "wave-normal-flow",
      "wave-burst-surge",
      "wave-hot-shard"
    ]);
  });

  it("keeps authored references aligned", () => {
    const pathIds = new Set(trafficSurgeMap.paths.map((path) => path.id));
    const towerIds = new Set(trafficSurgeTowerDefs.map((tower) => tower.id));
    const enemyIds = new Set(trafficSurgeEnemyDefs.map((enemy) => enemy.id));
    const waveIds = new Set(trafficSurgeLevel.waves.map((wave) => wave.id));

    expect(trafficSurgeLevel.mapId).toBe(trafficSurgeMap.id);
    expect(trafficSurgeLevel.availableTowerIds).toEqual(trafficSurgeTowerDefs.map((tower) => tower.id));

    for (const towerId of trafficSurgeLevel.availableTowerIds) {
      expect(towerIds.has(towerId)).toBe(true);
    }

    for (const wave of trafficSurgeLevel.waves) {
      for (const spawn of wave.spawns) {
        expect(enemyIds.has(spawn.enemyId)).toBe(true);
        expect(pathIds.has(spawn.pathId)).toBe(true);
      }
    }

    for (const recapLaw of trafficSurgeLevel.recapLaws) {
      expect(waveIds.has(recapLaw.afterWaveId)).toBe(true);
    }
  });

  it("places pads for first-level tower-defense decisions", () => {
    const workerPad = trafficSurgeMap.buildPads.find((pad) => pad.id === "pad-worker-a");
    const queuePad = trafficSurgeMap.buildPads.find((pad) => pad.id === "pad-queue-a");
    const loadBalancerPad = trafficSurgeMap.buildPads.find((pad) => pad.id === "pad-load-balancer-a");

    expect(workerPad).toMatchObject({ allowedTowerKinds: ["worker"] });
    expect(queuePad).toMatchObject({ allowedTowerKinds: ["queue"] });
    expect(loadBalancerPad).toMatchObject({ allowedTowerKinds: ["load-balancer"] });
    expect(workerTowerDef.range + queueSnareDef.range).toBeGreaterThanOrEqual(4);
    expect(loadBalancerGateDef.range).toBeGreaterThanOrEqual(2.5);
  });
});
