import { describe, expect, it } from "vitest";

import { trafficSurgeEnemyDefs, trafficSurgeMap, trafficSurgeTowerDefs } from "@content/traffic-surge-level";
import type { EnemyDef, SimSnapshot, TowerDef } from "@content/schemas";
import {
  coveredPathIdsForTower,
  deriveConnectionPreviews,
  enemyMatchesTowerTargets,
  scorePathCoverage
} from "@sim/tower-targeting";

type SnapshotTower = SimSnapshot["towers"][number];
type SnapshotEnemy = SimSnapshot["enemies"][number];

const towerDefsById = Object.fromEntries(
  trafficSurgeTowerDefs.map((towerDef) => [towerDef.id, towerDef])
) as Readonly<Record<string, TowerDef>>;

function requireEnemyDef(enemyId: string): EnemyDef {
  const enemyDef = trafficSurgeEnemyDefs.find((candidate) => candidate.id === enemyId);

  if (!enemyDef) {
    throw new Error(`Expected traffic surge enemy def ${enemyId}.`);
  }

  return enemyDef;
}

const requestRunner = requireEnemyDef("request-runner");
const burstSwarm = requireEnemyDef("burst-swarm");
const heavyPayload = requireEnemyDef("heavy-payload");

const workerTower: SnapshotTower = {
  id: "worker-tower@pad-worker-a#0",
  towerId: "worker-tower",
  padId: "pad-worker-a",
  cooldownRemainingTicks: 0
};

const queueSnare: SnapshotTower = {
  id: "queue-snare@pad-queue-a#1",
  towerId: "queue-snare",
  padId: "pad-queue-a",
  cooldownRemainingTicks: 0
};

const loadBalancer: SnapshotTower = {
  id: "load-balancer-gate@pad-load-balancer-a#2",
  towerId: "load-balancer-gate",
  padId: "pad-load-balancer-a",
  cooldownRemainingTicks: 0
};

describe("tower targeting helpers", () => {
  it("matches enemy defs against tower target tags", () => {
    expect(enemyMatchesTowerTargets(requestRunner, ["ground"])).toBe(true);
    expect(enemyMatchesTowerTargets(burstSwarm, ["swarm"])).toBe(true);
    expect(enemyMatchesTowerTargets(heavyPayload, ["heavy"])).toBe(true);
    expect(enemyMatchesTowerTargets(requestRunner, ["heavy"])).toBe(false);
  });

  it("scores path coverage from nearby worker and queue capacity", () => {
    const enemies: readonly SnapshotEnemy[] = [
      {
        id: "request-runner#0",
        enemyId: "request-runner",
        pathId: "road-main",
        progress: 0.5,
        health: 3,
        status: "active"
      }
    ];

    const score = scorePathCoverage({
      map: trafficSurgeMap,
      pathId: "road-main",
      towers: [workerTower, queueSnare],
      towerDefsById,
      enemies
    });

    expect(score).toBeCloseTo(1 * (100 / 12) + 1.5 - 1);
  });

  it("derives weak coverage for paths at or below zero once towers exist", () => {
    expect(
      scorePathCoverage({
        map: trafficSurgeMap,
        pathId: "road-main",
        towers: [loadBalancer],
        towerDefsById,
        enemies: []
      })
    ).toBe(0);

    expect(
      deriveConnectionPreviews({
        map: trafficSurgeMap,
        towers: [loadBalancer],
        towerDefsById,
        enemies: []
      })
    ).toEqual([
      { sourceId: loadBalancer.id, targetIds: ["road-main", "road-relief"], kind: "route-influence" },
      { sourceId: "road-main", targetIds: ["road-main"], kind: "weak-coverage" },
      { sourceId: "road-relief", targetIds: ["road-relief"], kind: "weak-coverage" }
    ]);
  });

  it("derives deterministic connection previews for queues, load balancers, and weak lanes", () => {
    const enemies: readonly SnapshotEnemy[] = [
      {
        id: "burst-swarm#0",
        enemyId: "burst-swarm",
        pathId: "road-main",
        progress: 0.45,
        health: 1,
        status: "active"
      }
    ];

    expect(
      deriveConnectionPreviews({
        map: trafficSurgeMap,
        towers: [workerTower, queueSnare, loadBalancer],
        towerDefsById,
        enemies
      })
    ).toEqual([
      { sourceId: queueSnare.id, targetIds: [workerTower.id], kind: "stall-window" },
      { sourceId: loadBalancer.id, targetIds: ["road-main", "road-relief"], kind: "route-influence" },
      { sourceId: "road-relief", targetIds: ["road-relief"], kind: "weak-coverage" }
    ]);
  });

  it("does not derive route influence when load balancer covers only one sibling route", () => {
    const loadBalancerDef = trafficSurgeTowerDefs.find((towerDef) => towerDef.id === "load-balancer-gate");

    if (!loadBalancerDef) {
      throw new Error("Expected traffic surge tower defs to include load-balancer-gate.");
    }

    const narrowLoadBalancerDef: TowerDef = { ...loadBalancerDef, range: 1.5 };
    const narrowTowerDefsById: Readonly<Record<string, TowerDef>> = {
      ...towerDefsById,
      "load-balancer-gate": narrowLoadBalancerDef
    };

    expect(coveredPathIdsForTower(trafficSurgeMap, loadBalancer, narrowLoadBalancerDef)).toEqual(["road-main"]);

    const previews = deriveConnectionPreviews({
      map: trafficSurgeMap,
      towers: [loadBalancer],
      towerDefsById: narrowTowerDefsById,
      enemies: []
    });

    expect(previews).not.toContainEqual(
      expect.objectContaining({
        sourceId: loadBalancer.id,
        kind: "route-influence"
      })
    );
  });
});
