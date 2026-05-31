import { describe, expect, it } from "vitest";

import { messageFestivalV0Level, messageFestivalV0Map } from "@content/message-festival-v0";
import type { MapMetadata, SimSnapshot } from "@content/schemas";
import {
  activePacketMessages,
  BATTLEFIELD_VIEW,
  buildSlotWorldPosition,
  battlefieldBuildings,
  buildingVisualState,
  messageWorldPosition,
  pathWorldPoints,
  queueFillCount
} from "@game/battlefield-view";

const snapshot: SimSnapshot = {
  tick: 24,
  phase: "wave",
  meters: {
    trust: 91,
    budget: 51,
    backlog: 2
  },
  buildings: [
    { id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "idle" },
    { id: "building-queue-hub", defId: "queue-hub", slotId: "slot_queue_1", state: "idle" },
    { id: "building-worker-yard", defId: "worker-yard", slotId: "slot_worker_1", state: "idle" }
  ],
  messages: [
    { id: "queued-1", type: "useful", status: "queued", pathId: "path-main", ageTicks: 18 },
    { id: "processing-1", type: "useful", status: "processing", pathId: "path-main", ageTicks: 22 }
  ],
  lanePressure: [{ pathId: "path-main", backlog: 2, dropped: 0 }],
  alerts: [],
  workerCount: 1,
  activeWaveId: "wave-opening-flow"
};

const queuedMessage = getItem(snapshot.messages, 0, "queued message");
const processingMessage = getItem(snapshot.messages, 1, "processing message");
const startingApiGate = getItem(messageFestivalV0Level.startingBuildings, 0, "starting API Gate");
const startingWorkerYard = getItem(
  messageFestivalV0Level.startingBuildings,
  1,
  "starting Worker Yard"
);
const shortPathMap: MapMetadata = {
  id: "short-map",
  paths: [
    { id: "path-short", spawnId: "spawn_1", exitId: "exit_1", nodeIds: ["spawn_1", "exit_1"] }
  ],
  buildSlots: [],
  spawns: [{ id: "spawn_1", x: 1, y: 2 }],
  exits: [{ id: "exit_1", x: 3, y: 2 }]
};
const noQueueMap: MapMetadata = {
  id: "no-queue-map",
  paths: [
    {
      id: "path-direct",
      spawnId: "spawn_1",
      exitId: "exit_1",
      nodeIds: ["spawn_1", "slot_ingress_1", "slot_worker_1", "exit_1"]
    }
  ],
  buildSlots: [
    { id: "slot_ingress_1", role: "api-gate", x: 4, y: 3 },
    { id: "slot_worker_1", role: "worker-yard", x: 8, y: 3 }
  ],
  spawns: [{ id: "spawn_1", x: 1, y: 3 }],
  exits: [{ id: "exit_1", x: 12, y: 3 }]
};

function getItem<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];

  if (!item) {
    throw new Error(`Missing ${label}`);
  }

  return item;
}

function snapshotWith(overrides: Partial<SimSnapshot>): SimSnapshot {
  return {
    ...snapshot,
    buildings: overrides.buildings ?? snapshot.buildings,
    messages: overrides.messages ?? snapshot.messages,
    lanePressure: overrides.lanePressure ?? snapshot.lanePressure,
    meters: overrides.meters ?? snapshot.meters,
    ...overrides
  };
}

describe("battlefield view model", () => {
  it("maps authored path nodes to world points", () => {
    expect(pathWorldPoints(messageFestivalV0Map, "path-main")).toEqual([
      { x: 222, y: 442 },
      { x: 438, y: 442 },
      { x: 582, y: 442 },
      { x: 726, y: 442 },
      { x: 1014, y: 442 }
    ]);
  });

  it("accepts schema-valid paths with two visible nodes", () => {
    expect(pathWorldPoints(shortPathMap, "path-short")).toEqual([
      { x: 222, y: 154 },
      { x: 366, y: 154 }
    ]);
  });

  it("maps build slots to world positions", () => {
    expect(buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1")).toEqual({
      x: BATTLEFIELD_VIEW.originX + 6 * BATTLEFIELD_VIEW.tileSize,
      y: BATTLEFIELD_VIEW.originY + 6 * BATTLEFIELD_VIEW.tileSize
    });
  });

  it("anchors active messages to their lane stations", () => {
    expect(messageWorldPosition(messageFestivalV0Map, queuedMessage)).toEqual({ x: 582, y: 408 });
    expect(messageWorldPosition(messageFestivalV0Map, processingMessage)).toEqual({
      x: 726,
      y: 408
    });
  });

  it("anchors dropped and expired messages to the queue station", () => {
    expect(
      messageWorldPosition(messageFestivalV0Map, {
        id: "dropped-1",
        type: "useful",
        status: "dropped",
        pathId: "path-main",
        ageTicks: 32
      })
    ).toEqual({ x: 582, y: 408 });
    expect(
      messageWorldPosition(messageFestivalV0Map, {
        id: "expired-1",
        type: "useful",
        status: "expired",
        pathId: "path-main",
        ageTicks: 121
      })
    ).toEqual({ x: 582, y: 408 });
  });

  it("falls back to the API gate for failures when a path has no queue hub", () => {
    expect(
      messageWorldPosition(noQueueMap, {
        id: "dropped-direct-1",
        type: "useful",
        status: "dropped",
        pathId: "path-direct",
        ageTicks: 32
      })
    ).toEqual({ x: 438, y: 192 });
  });

  it("anchors direct-handoff failures to the placed API Gate when the queue is unbuilt", () => {
    expect(
      messageWorldPosition(
        messageFestivalV0Map,
        {
          id: "dropped-direct-unbuilt-queue",
          type: "useful",
          status: "dropped",
          pathId: "path-main",
          ageTicks: 32
        },
        messageFestivalV0Level.startingBuildings
      )
    ).toEqual({ x: 438, y: 408 });
  });

  it("counts queued messages for queue fill", () => {
    expect(queueFillCount(snapshot)).toBe(1);
  });

  it("uses snapshot buildings as the battlefield render source", () => {
    expect(battlefieldBuildings(snapshot).map((building) => building.defId)).toEqual([
      "api-gate",
      "queue-hub",
      "worker-yard"
    ]);
  });

  it("omits delivered historical messages from active packet rendering", () => {
    const deliveredSnapshot = snapshotWith({
      messages: [
        ...snapshot.messages,
        {
          id: "delivered-1",
          type: "useful",
          status: "delivered",
          pathId: "path-main",
          ageTicks: 42
        }
      ]
    });

    expect(activePacketMessages(deliveredSnapshot).map((message) => message.id)).toEqual([
      "queued-1",
      "processing-1"
    ]);
  });

  it("derives visual state for starting buildings", () => {
    expect(buildingVisualState(snapshot, startingApiGate)).toBe("accepting");
  });

  it("prefers saturated and processing snapshot building states", () => {
    const saturatedSnapshot = snapshotWith({
      buildings: [
        { id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "saturated" }
      ]
    });
    const processingSnapshot = snapshotWith({
      buildings: [
        {
          id: "building-api-gate",
          defId: "api-gate",
          slotId: "slot_ingress_1",
          state: "processing"
        }
      ]
    });

    expect(buildingVisualState(saturatedSnapshot, startingApiGate)).toBe("saturated");
    expect(buildingVisualState(processingSnapshot, startingApiGate)).toBe("processing");
  });

  it("derives queue-hub filling from queued messages", () => {
    expect(buildingVisualState(snapshot, { defId: "queue-hub", slotId: "slot_queue_1" })).toBe(
      "filling"
    );
  });

  it("derives worker-yard processing from processing messages", () => {
    expect(buildingVisualState(snapshot, startingWorkerYard)).toBe("processing");
  });

  it("falls back to idle when no visual activity applies", () => {
    const idleSnapshot = snapshotWith({
      buildings: [
        { id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "idle" }
      ],
      messages: []
    });

    expect(buildingVisualState(idleSnapshot, startingApiGate)).toBe("idle");
  });
});
