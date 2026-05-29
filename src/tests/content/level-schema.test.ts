import { describe, expect, it } from "vitest";

import {
  validateBuildingDef,
  validateCommand,
  validateLevelConfig,
  validateMapMetadata,
  validatePostWaveResult,
  validateSimEvent,
  validateSimSnapshot,
  validateWaveDef
} from "@content/schemas";

const validMapMetadata = {
  id: "map-message-festival-v0",
  paths: [
    {
      id: "path-main",
      spawnId: "spawn_festival_gate",
      exitId: "exit_storage_1",
      nodeIds: ["spawn_festival_gate", "slot_ingress_1", "slot_worker_1", "exit_storage_1"]
    }
  ],
  buildSlots: [
    { id: "slot_ingress_1", role: "api-gate", x: 4, y: 6 },
    { id: "slot_worker_1", role: "worker-yard", x: 8, y: 6 },
    { id: "slot_queue_1", role: "queue-hub", x: 6, y: 6 }
  ],
  spawns: [{ id: "spawn_festival_gate", x: 1, y: 6 }],
  exits: [{ id: "exit_storage_1", x: 12, y: 6 }]
};

const validBuildingDef = {
  id: "queue-hub",
  role: "queue-hub",
  cost: 40,
  allowedSlots: ["slot_queue_1"],
  stats: {
    capacity: 24
  },
  visibleStates: ["idle", "active", "overflowing"]
};

const validWaveDef = {
  id: "wave-opening-flow",
  durationTicks: 200,
  timeoutTicks: 300,
  spawnSchedule: [
    {
      tick: 0,
      messageType: "useful",
      count: 1
    }
  ],
  messageTypes: ["useful"],
  recapId: "recap-opening-flow"
};

const validLevelConfig = {
  id: "message-festival-bootstrap",
  mapId: "map-message-festival-v0",
  startingState: {
    budget: 50,
    trust: 100,
    backlog: 0,
    workerCount: 1
  },
  startingBuildings: [
    {
      defId: "api-gate",
      slotId: "slot_ingress_1"
    }
  ],
  availableBuildings: ["queue-hub"],
  waves: [validWaveDef],
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
      lines: ["Requests enter through the API and finish only after useful work."]
    }
  ]
};

describe("first playable content schemas", () => {
  it("accepts valid first playable level config", () => {
    expect(validateLevelConfig(validLevelConfig).ok).toBe(true);
  });

  it("accepts level unlock rules for first playable progression", () => {
    expect(
      validateLevelConfig({
        ...validLevelConfig,
        unlocks: [
          {
            afterWaveId: "wave-opening-flow",
            buildingIds: ["queue-hub"],
            commandTypes: ["PlaceBuilding", "SetWorkerCount"]
          }
        ]
      }).ok
    ).toBe(true);
  });

  it("rejects invalid unlock command types", () => {
    expect(
      validateLevelConfig({
        ...validLevelConfig,
        unlocks: [
          {
            afterWaveId: "wave-opening-flow",
            commandTypes: ["UpgradeBuilding"]
          }
        ]
      }).ok
    ).toBe(false);
  });

  it("accepts valid map metadata", () => {
    expect(validateMapMetadata(validMapMetadata).ok).toBe(true);
  });

  it("accepts valid building definitions", () => {
    expect(validateBuildingDef(validBuildingDef).ok).toBe(true);
  });

  it("rejects building stat records with empty keys", () => {
    expect(validateBuildingDef({ ...validBuildingDef, stats: { "": 1 } }).ok).toBe(false);
  });

  it("accepts valid wave definitions", () => {
    expect(validateWaveDef(validWaveDef).ok).toBe(true);
  });

  it("accepts only first playable commands", () => {
    expect(validateCommand({ type: "StartWave", waveId: "wave-opening-flow" }).ok).toBe(true);
    expect(validateCommand({ type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }).ok).toBe(true);
    expect(validateCommand({ type: "SetWorkerCount", count: 2 }).ok).toBe(true);
    expect(validateCommand({ type: "UpgradeBuilding", buildingId: "api-gate" }).ok).toBe(false);
  });

  it("accepts renderable simulator snapshots", () => {
    const result = validateSimSnapshot({
      tick: 10,
      phase: "wave",
      meters: {
        trust: 100,
        budget: 50,
        backlog: 3
      },
      buildings: [
        {
          id: "building-api-1",
          defId: "api-gate",
          slotId: "slot_ingress_1",
          state: "active"
        }
      ],
      messages: [
        {
          id: "message-1",
          type: "useful",
          status: "queued",
          pathId: "path-main",
          ageTicks: 20
        }
      ],
      lanePressure: [
        {
          pathId: "path-main",
          backlog: 3,
          dropped: 0
        }
      ],
      alerts: ["Queue absorbing burst"],
      workerCount: 2,
      activeWaveId: "wave-opening-flow"
    });

    expect(result.ok).toBe(true);
  });

  it("rejects empty recap text", () => {
    expect(
      validateLevelConfig({
        ...validLevelConfig,
        recaps: [{ id: "recap-opening-flow", lines: [] }]
      }).ok
    ).toBe(false);
  });

  it("rejects invalid dynamic simulator snapshot state", () => {
    expect(
      validateSimSnapshot({
        tick: 10,
        phase: "wave",
        meters: {
          trust: 100,
          budget: 50,
          backlog: 3
        },
        buildings: [],
        messages: [],
        lanePressure: [],
        alerts: [],
        workerCount: 0,
        activeWaveId: ""
      }).ok
    ).toBe(false);
  });

  it("accepts simulator events needed by animation and recap", () => {
    expect(validateSimEvent({ tick: 1, type: "message.spawned", messageId: "message-1", messageType: "useful" }).ok).toBe(true);
    expect(validateSimEvent({ tick: 2, type: "meter.changed", meter: "backlog", delta: 1, value: 1 }).ok).toBe(true);
    expect(validateSimEvent({ tick: 3, type: "wave.ended", waveId: "wave-opening-flow" }).ok).toBe(true);
  });

  it("accepts post-wave recap results", () => {
    expect(
      validatePostWaveResult({
        waveId: "wave-opening-flow",
        delivered: 12,
        dropped: 0,
        expired: 0,
        backlogPeak: 2,
        trustDelta: -3,
        budgetDelta: -40,
        playerActionsUsed: [{ type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }],
        revealedBackendTerm: "Queue",
        revealedLaw: "Queues decouple producers from consumers, but capacity still has limits."
      }).ok
    ).toBe(true);
  });

  it("rejects post-wave recap results missing learning contract fields", () => {
    expect(
      validatePostWaveResult({
        waveId: "wave-opening-flow",
        delivered: 12,
        dropped: 0,
        expired: 0,
        backlogPeak: 2
      }).ok
    ).toBe(false);
  });

  it("rejects missing required level fields", () => {
    const result = validateLevelConfig({
      id: "message-festival-bootstrap",
      mapId: "map-message-festival-v0"
    });

    expect(result.ok).toBe(false);
  });

  it("rejects extra fields in nested level objects", () => {
    const result = validateLevelConfig({
      ...validLevelConfig,
      startingState: {
        ...validLevelConfig.startingState,
        unused: true
      }
    });

    expect(result.ok).toBe(false);
  });

  it("rejects invalid role values", () => {
    expect(validateBuildingDef({ ...validBuildingDef, role: "db-vault" }).ok).toBe(false);
    expect(validateMapMetadata({ ...validMapMetadata, buildSlots: [{ id: "slot_bad", role: "db-vault", x: 0, y: 0 }] }).ok).toBe(false);
  });
});
