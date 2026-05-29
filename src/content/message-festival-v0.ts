import type { BuildingDef, LevelConfig, MapMetadata, WaveDef } from "@content/schemas";

const usefulMessage = "useful" satisfies WaveDef["messageTypes"][number];

function spawnEvery(intervalTicks: number, groups: number, count: number): WaveDef["spawnSchedule"] {
  return Array.from({ length: groups }, (_, index) => ({
    tick: index * intervalTicks,
    messageType: usefulMessage,
    count
  }));
}

export const messageFestivalV0Map: MapMetadata = {
  id: "map-message-festival-v0",
  paths: [
    {
      id: "path-main",
      spawnId: "spawn_festival_gate",
      exitId: "exit_storage_1",
      nodeIds: ["spawn_festival_gate", "slot_ingress_1", "slot_queue_1", "slot_worker_1", "exit_storage_1"]
    }
  ],
  buildSlots: [
    { id: "slot_ingress_1", role: "api-gate", x: 4, y: 6 },
    { id: "slot_queue_1", role: "queue-hub", x: 6, y: 6 },
    { id: "slot_worker_1", role: "worker-yard", x: 8, y: 6 }
  ],
  spawns: [{ id: "spawn_festival_gate", x: 1, y: 6 }],
  exits: [{ id: "exit_storage_1", x: 12, y: 6 }]
};

export const apiGateDef: BuildingDef = {
  id: "api-gate",
  role: "api-gate",
  cost: 0,
  allowedSlots: ["slot_ingress_1"],
  stats: {
    acceptPerSecond: 3,
    directHandoffCapacity: 4,
    messagePatienceTicks: 120
  },
  visibleStates: ["idle", "accepting", "saturated"]
};

export const queueHubDef: BuildingDef = {
  id: "queue-hub",
  role: "queue-hub",
  cost: 40,
  allowedSlots: ["slot_queue_1"],
  stats: {
    capacity: 24
  },
  visibleStates: ["idle", "filling", "overflowing"]
};

export const workerYardDef: BuildingDef = {
  id: "worker-yard",
  role: "worker-yard",
  cost: 0,
  allowedSlots: ["slot_worker_1"],
  stats: {
    processingTicks: 10,
    messagesPerWorkerPerSecond: 1,
    maxWorkers: 2,
    workerCountUpgradeCost: 20
  },
  visibleStates: ["idle", "processing", "saturated"]
};

export const messageFestivalV0BuildingDefs = [apiGateDef, queueHubDef, workerYardDef] as const;

const openingFlowWave: WaveDef = {
  id: "wave-opening-flow",
  durationTicks: 200,
  timeoutTicks: 300,
  spawnSchedule: spawnEvery(16, 12, 1),
  messageTypes: [usefulMessage],
  recapId: "recap-opening-flow"
};

const floodWave: WaveDef = {
  id: "wave-flood",
  durationTicks: 160,
  timeoutTicks: 700,
  spawnSchedule: spawnEvery(10, 16, 3),
  messageTypes: [usefulMessage],
  recapId: "recap-flood"
};

export const messageFestivalV0Level: LevelConfig = {
  id: "message-festival-v0",
  mapId: messageFestivalV0Map.id,
  startingState: {
    budget: 50,
    trust: 100,
    backlog: 0,
    workerCount: 1
  },
  startingBuildings: [
    {
      defId: apiGateDef.id,
      slotId: "slot_ingress_1"
    },
    {
      defId: workerYardDef.id,
      slotId: "slot_worker_1"
    }
  ],
  availableBuildings: [queueHubDef.id],
  unlocks: [
    {
      afterWaveId: openingFlowWave.id,
      buildingIds: [queueHubDef.id],
      commandTypes: ["PlaceBuilding", "SetWorkerCount"]
    }
  ],
  waves: [openingFlowWave, floodWave],
  winCondition: {
    kind: "trust-at-least",
    value: 70
  },
  lossCondition: {
    kind: "trust-below",
    value: 70
  },
  recaps: [
    {
      id: "recap-opening-flow",
      lines: [
        "Useful messages enter through the API Gate.",
        "A message only counts after Worker Yard acks it.",
        "Backend law: APIs accept work; consumers finish it."
      ]
    },
    {
      id: "recap-flood",
      lines: [
        "Queue Hub absorbs bursts before workers are ready.",
        "Backlog still peaks when workers process too slowly.",
        "Queue: absorbs bursts, but does not create worker capacity."
      ]
    }
  ]
};
