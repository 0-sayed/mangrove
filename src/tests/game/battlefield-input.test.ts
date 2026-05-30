import { describe, expect, it } from "vitest";

import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { BuildingDef, LevelConfig, MapMetadata, SimSnapshot } from "@content/schemas";
import {
  buildSlotCommandForWorldPoint,
  increaseWorkerCountCommand,
  startNextWaveCommand
} from "@game/battlefield-input";
import { buildSlotWorldPosition } from "@game/battlefield-view";

const baseSnapshot: SimSnapshot = {
  tick: 0,
  phase: "setup",
  meters: { trust: 100, budget: 50, backlog: 0 },
  buildings: [
    { id: "api-gate@slot_ingress_1#0", defId: "api-gate", slotId: "slot_ingress_1", state: "idle" },
    {
      id: "worker-yard@slot_worker_1#1",
      defId: "worker-yard",
      slotId: "slot_worker_1",
      state: "idle"
    }
  ],
  messages: [],
  lanePressure: [],
  alerts: [],
  workerCount: 1
};

const customMap: MapMetadata = {
  id: "map-custom-input",
  paths: [
    {
      id: "path-custom",
      spawnId: "spawn_custom",
      exitId: "exit_custom",
      nodeIds: ["spawn_custom", "slot_custom_queue_1", "exit_custom"]
    }
  ],
  buildSlots: [{ id: "slot_custom_queue_1", role: "queue-hub", x: 2, y: 2 }],
  spawns: [{ id: "spawn_custom", x: 1, y: 2 }],
  exits: [{ id: "exit_custom", x: 4, y: 2 }]
};

const multiQueueMap: MapMetadata = {
  ...customMap,
  buildSlots: [
    { id: "slot_custom_queue_1", role: "queue-hub", x: 2, y: 2 },
    { id: "slot_custom_queue_2", role: "queue-hub", x: 3, y: 2 }
  ]
};

const customLevel: LevelConfig = {
  ...messageFestivalV0Level,
  id: "custom-input-level",
  mapId: customMap.id,
  availableBuildings: ["custom-queue-hub"]
};

const customQueueHubDef: BuildingDef = {
  id: "custom-queue-hub",
  role: "queue-hub",
  cost: 0,
  allowedSlots: ["slot_custom_queue_1"],
  stats: { capacity: 1 },
  visibleStates: ["idle"]
};

function snapshotWith(overrides: Partial<SimSnapshot>): SimSnapshot {
  return {
    ...baseSnapshot,
    buildings: overrides.buildings ?? baseSnapshot.buildings,
    messages: overrides.messages ?? baseSnapshot.messages,
    lanePressure: overrides.lanePressure ?? baseSnapshot.lanePressure,
    meters: overrides.meters ?? baseSnapshot.meters,
    ...overrides
  };
}

function snapshotWithoutWorkerCount(overrides: Partial<SimSnapshot>): SimSnapshot {
  const snapshot = snapshotWith(overrides);
  const withoutWorkerCount = { ...snapshot };
  delete withoutWorkerCount.workerCount;

  return withoutWorkerCount;
}

describe("battlefield input commands", () => {
  it("starts the first authored wave from setup", () => {
    expect(startNextWaveCommand(messageFestivalV0Level, baseSnapshot)).toEqual({
      type: "StartWave",
      waveId: "wave-opening-flow"
    });
  });

  it("starts the next authored wave from recap", () => {
    expect(
      startNextWaveCommand(
        messageFestivalV0Level,
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" })
      )
    ).toEqual({ type: "StartWave", waveId: "wave-flood" });
  });

  it("does not start the next wave while recap messages remain active", () => {
    expect(
      startNextWaveCommand(
        messageFestivalV0Level,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          messages: [
            { id: "message-1", type: "useful", status: "queued", pathId: "path-main", ageTicks: 0 }
          ]
        })
      )
    ).toBe(undefined);
  });

  it("does not start a recap wave without a valid active wave context", () => {
    expect(
      startNextWaveCommand(messageFestivalV0Level, snapshotWith({ phase: "recap" }))
    ).toBe(undefined);
    expect(
      startNextWaveCommand(
        messageFestivalV0Level,
        snapshotWith({ phase: "recap", activeWaveId: "wave-missing" })
      )
    ).toBe(undefined);
  });

  it("does not start a wave while a wave is active", () => {
    expect(startNextWaveCommand(messageFestivalV0Level, snapshotWith({ phase: "wave" }))).toBe(
      undefined
    );
  });

  it("does not start a wave after completion or after the final authored wave", () => {
    expect(
      startNextWaveCommand(messageFestivalV0Level, snapshotWith({ phase: "complete" }))
    ).toBe(undefined);
    expect(
      startNextWaveCommand(
        messageFestivalV0Level,
        snapshotWith({ phase: "recap", activeWaveId: "wave-flood" })
      )
    ).toBe(undefined);
  });

  it("maps a recap click on empty slot_queue_1 to Queue Hub placement", () => {
    const point = buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1");

    expect(
      buildSlotCommandForWorldPoint(
        messageFestivalV0Level,
        messageFestivalV0Map,
        messageFestivalV0BuildingDefs,
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" }),
        point
      )
    ).toEqual({ type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" });
  });

  it("does not map build slot clicks outside recap or on occupied slots", () => {
    const point = buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1");
    const occupiedSnapshot = snapshotWith({
      phase: "recap",
      activeWaveId: "wave-opening-flow",
      buildings: [
        ...baseSnapshot.buildings,
        { id: "queue-hub@slot_queue_1#2", defId: "queue-hub", slotId: "slot_queue_1", state: "idle" }
      ]
    });

    expect(
      buildSlotCommandForWorldPoint(
        messageFestivalV0Level,
        messageFestivalV0Map,
        messageFestivalV0BuildingDefs,
        baseSnapshot,
        point
      )
    ).toBe(undefined);
    expect(
      buildSlotCommandForWorldPoint(
        messageFestivalV0Level,
        messageFestivalV0Map,
        messageFestivalV0BuildingDefs,
        occupiedSnapshot,
        point
      )
    ).toBe(undefined);
  });

  it("does not map Queue Hub placement when budget is below cost", () => {
    const point = buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1");

    expect(
      buildSlotCommandForWorldPoint(
        messageFestivalV0Level,
        messageFestivalV0Map,
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          meters: { ...baseSnapshot.meters, budget: 39 }
        }),
        point
      )
    ).toBe(undefined);
  });

  it("does not map build slot clicks just outside the hitbox", () => {
    const point = buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1");

    expect(
      buildSlotCommandForWorldPoint(
        messageFestivalV0Level,
        messageFestivalV0Map,
        messageFestivalV0BuildingDefs,
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" }),
        { x: point.x + 35, y: point.y }
      )
    ).toBe(undefined);
  });

  it("filters build placement by role, allowed slot, and level availability", () => {
    const point = buildSlotWorldPosition(customMap, "slot_custom_queue_1");
    const recapSnapshot = snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" });

    expect(
      buildSlotCommandForWorldPoint(
        customLevel,
        customMap,
        [{ ...customQueueHubDef, role: "api-gate" }],
        recapSnapshot,
        point
      )
    ).toBe(undefined);
    expect(
      buildSlotCommandForWorldPoint(
        customLevel,
        customMap,
        [{ ...customQueueHubDef, allowedSlots: ["slot_other"] }],
        recapSnapshot,
        point
      )
    ).toBe(undefined);
    expect(
      buildSlotCommandForWorldPoint(
        { ...customLevel, availableBuildings: [] },
        customMap,
        [customQueueHubDef],
        recapSnapshot,
        point
      )
    ).toBe(undefined);
  });

  it("does not map placement when the same building def already exists elsewhere", () => {
    const point = buildSlotWorldPosition(multiQueueMap, "slot_custom_queue_2");

    expect(
      buildSlotCommandForWorldPoint(
        { ...customLevel, mapId: multiQueueMap.id },
        multiQueueMap,
        [
          {
            ...customQueueHubDef,
            allowedSlots: ["slot_custom_queue_1", "slot_custom_queue_2"]
          }
        ],
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          buildings: [
            ...baseSnapshot.buildings,
            {
              id: "custom-queue-hub@slot_custom_queue_1#2",
              defId: "custom-queue-hub",
              slotId: "slot_custom_queue_1",
              state: "idle"
            }
          ]
        }),
        point
      )
    ).toBe(undefined);
  });

  it("selects the nearest placeable build slot when hitboxes overlap", () => {
    const point = buildSlotWorldPosition(multiQueueMap, "slot_custom_queue_2");

    expect(
      buildSlotCommandForWorldPoint(
        { ...customLevel, mapId: multiQueueMap.id },
        multiQueueMap,
        [
          {
            ...customQueueHubDef,
            allowedSlots: ["slot_custom_queue_2"]
          }
        ],
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" }),
        point
      )
    ).toEqual({
      type: "PlaceBuilding",
      buildingId: "custom-queue-hub",
      slotId: "slot_custom_queue_2"
    });
  });

  it("maps settled recap worker count increase by one", () => {
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" })
      )
    ).toEqual({ type: "SetWorkerCount", count: 2 });
  });

  it("does not increase worker count while active messages remain or max workers is reached", () => {
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          messages: [
            { id: "message-1", type: "useful", status: "queued", pathId: "path-main", ageTicks: 0 }
          ]
        })
      )
    ).toBe(undefined);
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow", workerCount: 2 })
      )
    ).toBe(undefined);
  });

  it("does not increase worker count outside recap or without worker count", () => {
    expect(increaseWorkerCountCommand(messageFestivalV0BuildingDefs, baseSnapshot)).toBe(
      undefined
    );
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWithoutWorkerCount({ phase: "recap", activeWaveId: "wave-opening-flow" })
      )
    ).toBe(undefined);
  });

  it("does not increase worker count without a placed worker yard", () => {
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          buildings: baseSnapshot.buildings.filter((building) => building.defId !== "worker-yard")
        })
      )
    ).toBe(undefined);
  });

  it("does not increase worker count when budget or worker stats do not permit it", () => {
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          meters: { ...baseSnapshot.meters, budget: 19 }
        })
      )
    ).toBe(undefined);
    expect(
      increaseWorkerCountCommand(
        [{ ...messageFestivalV0BuildingDefs[1] }, { ...messageFestivalV0BuildingDefs[2], stats: { workerCountUpgradeCost: 20 } }],
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" })
      )
    ).toBe(undefined);
    expect(
      increaseWorkerCountCommand(
        [{ ...messageFestivalV0BuildingDefs[1] }, { ...messageFestivalV0BuildingDefs[2], stats: { maxWorkers: 2 } }],
        snapshotWith({ phase: "recap", activeWaveId: "wave-opening-flow" })
      )
    ).toBe(undefined);
  });

  it("does not increase worker count while accepted or processing messages remain", () => {
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          messages: [
            { id: "message-accepted", type: "useful", status: "accepted", pathId: "path-main", ageTicks: 0 }
          ]
        })
      )
    ).toBe(undefined);
    expect(
      increaseWorkerCountCommand(
        messageFestivalV0BuildingDefs,
        snapshotWith({
          phase: "recap",
          activeWaveId: "wave-opening-flow",
          messages: [
            {
              id: "message-processing",
              type: "useful",
              status: "processing",
              pathId: "path-main",
              ageTicks: 0
            }
          ]
        })
      )
    ).toBe(undefined);
  });
});
