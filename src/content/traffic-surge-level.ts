import type { EnemyDef, LevelConfig, MapDef, TowerDef, WaveDef } from "@content/schemas";

export const trafficSurgeMap: MapDef = {
  id: "map-traffic-surge-at-the-gate",
  size: { width: 16, height: 10 },
  paths: [
    {
      id: "road-main",
      portalId: "incident-portal-1",
      coreId: "service-core",
      points: [
        { x: 0, y: 5 },
        { x: 3, y: 5 },
        { x: 5, y: 3 },
        { x: 8, y: 3 },
        { x: 11, y: 6 },
        { x: 15, y: 6 }
      ],
      length: 16
    },
    {
      id: "road-relief",
      portalId: "incident-portal-1",
      coreId: "service-core",
      points: [
        { x: 0, y: 5 },
        { x: 3, y: 5 },
        { x: 5, y: 7 },
        { x: 9, y: 7 },
        { x: 12, y: 5 },
        { x: 15, y: 6 }
      ],
      length: 17
    }
  ],
  buildPads: [
    { id: "pad-worker-a", x: 4, y: 2, allowedTowerKinds: ["worker"] },
    { id: "pad-queue-a", x: 5, y: 4, allowedTowerKinds: ["queue"] },
    { id: "pad-load-balancer-a", x: 8, y: 5, allowedTowerKinds: ["load-balancer"] }
  ],
  portals: [{ id: "incident-portal-1", x: 0, y: 5 }],
  cores: [{ id: "service-core", x: 15, y: 6 }]
};

export const workerTowerDef: TowerDef = {
  id: "worker-tower",
  kind: "worker",
  displayName: "Worker Tower",
  cost: 30,
  range: 2.6,
  targets: ["ground"],
  combat: { damage: 1, cooldownTicks: 12 },
  softwareShadow: "Consumer capacity"
};

export const queueSnareDef: TowerDef = {
  id: "queue-snare",
  kind: "queue",
  displayName: "Queue Snare",
  cost: 25,
  range: 2.2,
  targets: ["ground", "swarm"],
  combat: { damage: 0, cooldownTicks: 30 },
  softwareShadow: "Buffer capacity that buys nearby workers time"
};

export const loadBalancerGateDef: TowerDef = {
  id: "load-balancer-gate",
  kind: "load-balancer",
  displayName: "Load Balancer Gate",
  cost: 35,
  range: 2.8,
  targets: ["ground", "heavy"],
  combat: { damage: 0, cooldownTicks: 24 },
  softwareShadow: "Traffic distribution toward healthier capacity"
};

export const trafficSurgeTowerDefs = [workerTowerDef, queueSnareDef, loadBalancerGateDef] as const;

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

const burstSwarmDef: EnemyDef = {
  id: "burst-swarm",
  kind: "burst-swarm",
  displayName: "Burst Swarm",
  maxHealth: 1,
  speed: 1.3,
  leakDamage: 1,
  reward: 1,
  traits: ["burst-traffic", "swarm"]
};

const heavyPayloadDef: EnemyDef = {
  id: "heavy-payload",
  kind: "heavy-payload",
  displayName: "Heavy Payload",
  maxHealth: 8,
  speed: 0.55,
  leakDamage: 3,
  reward: 5,
  traits: ["large-job", "heavy"]
};

export const trafficSurgeEnemyDefs = [requestRunnerDef, burstSwarmDef, heavyPayloadDef] as const;

const normalFlowWave: WaveDef = {
  id: "wave-normal-flow",
  displayName: "Normal Flow",
  preview: {
    enemyKinds: ["request-runner"],
    pressure: "low",
    hint: "Basic traffic follows the main road."
  },
  spawns: [{ tick: 0, enemyId: requestRunnerDef.id, pathId: "road-main", count: 6, intervalTicks: 18 }],
  budgetReward: 15
};

const burstSurgeWave: WaveDef = {
  id: "wave-burst-surge",
  displayName: "Burst Surge",
  preview: {
    enemyKinds: ["request-runner", "burst-swarm"],
    pressure: "medium",
    hint: "A swarm arrives fast enough that a queue stall buys time."
  },
  spawns: [
    { tick: 0, enemyId: requestRunnerDef.id, pathId: "road-main", count: 8, intervalTicks: 14 },
    { tick: 6, enemyId: burstSwarmDef.id, pathId: "road-main", count: 10, intervalTicks: 8 }
  ],
  budgetReward: 22
};

const hotShardWave: WaveDef = {
  id: "wave-hot-shard",
  displayName: "Hot Shard",
  preview: {
    enemyKinds: ["request-runner", "burst-swarm", "heavy-payload"],
    pressure: "high",
    hint: "Heavy traffic and relief-lane pressure make distribution matter."
  },
  spawns: [
    { tick: 0, enemyId: heavyPayloadDef.id, pathId: "road-main", count: 3, intervalTicks: 28 },
    { tick: 8, enemyId: burstSwarmDef.id, pathId: "road-relief", count: 12, intervalTicks: 9 },
    { tick: 18, enemyId: requestRunnerDef.id, pathId: "road-relief", count: 6, intervalTicks: 12 }
  ],
  budgetReward: 30
};

export const trafficSurgeLevel: LevelConfig = {
  id: "traffic-surge-at-the-gate",
  mapId: trafficSurgeMap.id,
  startingState: {
    townHealth: 20,
    buildBudget: 60,
    pressure: 0
  },
  availableTowerIds: trafficSurgeTowerDefs.map((towerDef) => towerDef.id),
  waves: [normalFlowWave, burstSurgeWave, hotShardWave],
  recapLaws: [
    {
      id: "law-worker-throughput",
      afterWaveId: normalFlowWave.id,
      text: "Throughput is capacity placed close to demand, not a label on a diagram."
    },
    {
      id: "law-queue-buys-time",
      afterWaveId: burstSurgeWave.id,
      text: "Queues absorb bursts so workers can recover, but every buffer has a limit."
    },
    {
      id: "law-load-balancing-needs-health",
      afterWaveId: hotShardWave.id,
      text: "Load balancing helps only when the destination has enough healthy capacity."
    }
  ]
};
