import type { EnemyDef, LevelConfig, MapDef, TowerDef, WaveDef } from "@content/schemas";

export const tdContractFixtureMap: MapDef = {
  id: "map-traffic-surge-contract",
  size: { width: 16, height: 9 },
  paths: [
    {
      id: "road-main",
      portalId: "incident-portal-1",
      coreId: "service-core",
      points: [
        { x: 0, y: 4 },
        { x: 4, y: 4 },
        { x: 8, y: 6 }
      ],
      length: 12
    }
  ],
  buildPads: [
    { id: "pad-worker-a", x: 4, y: 3, allowedTowerKinds: ["worker"] },
    { id: "pad-queue-a", x: 5, y: 5, allowedTowerKinds: ["queue"] },
    { id: "pad-load-balancer-a", x: 7, y: 4, allowedTowerKinds: ["load-balancer"] }
  ],
  portals: [{ id: "incident-portal-1", x: 0, y: 4 }],
  cores: [{ id: "service-core", x: 8, y: 6 }]
};

export const workerTowerDef: TowerDef = {
  id: "worker-tower",
  kind: "worker",
  displayName: "Worker Tower",
  cost: 30,
  range: 2.5,
  targets: ["ground"],
  combat: { damage: 1, cooldownTicks: 12 },
  softwareShadow: "Consumer capacity"
};

const requestRunnerDef: EnemyDef = {
  id: "request-runner",
  kind: "request-runner",
  displayName: "Request Runner",
  maxHealth: 3,
  speed: 1,
  leakDamage: 1,
  reward: 2,
  traits: ["normal-request"]
};

const normalFlowWave: WaveDef = {
  id: "wave-normal-flow",
  displayName: "Normal Flow",
  preview: {
    enemyKinds: ["request-runner"],
    pressure: "low",
    hint: "Basic traffic follows the main road."
  },
  spawns: [{ tick: 0, enemyId: requestRunnerDef.id, pathId: "road-main", count: 3, intervalTicks: 20 }],
  budgetReward: 10
};

export const tdContractFixtureLevel: LevelConfig = {
  id: "traffic-surge-contract-fixture",
  mapId: tdContractFixtureMap.id,
  startingState: {
    townHealth: 20,
    buildBudget: 60,
    pressure: 0
  },
  availableTowerIds: [workerTowerDef.id],
  waves: [normalFlowWave],
  recapLaws: [
    {
      id: "law-worker-throughput",
      afterWaveId: normalFlowWave.id,
      text: "Workers turn queued work into completed work, but only within capacity."
    }
  ]
};

export const tdContractFixtureTowerDefs = [workerTowerDef] as const;
export const tdContractFixtureEnemyDefs = [requestRunnerDef] as const;
