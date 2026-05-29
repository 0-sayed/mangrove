import { describe, expect, it } from "vitest";

import { messageFestivalV0Level, messageFestivalV0Map } from "@content/message-festival-v0";
import type { SimSnapshot } from "@content/schemas";
import {
  BATTLEFIELD_VIEW,
  buildSlotWorldPosition,
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
const startingWorkerYard = getItem(messageFestivalV0Level.startingBuildings, 1, "starting Worker Yard");

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
      { x: 144, y: 256 },
      { x: 240, y: 256 },
      { x: 304, y: 256 },
      { x: 368, y: 256 },
      { x: 496, y: 256 }
    ]);
  });

  it("maps build slots to world positions", () => {
    expect(buildSlotWorldPosition(messageFestivalV0Map, "slot_queue_1")).toEqual({
      x: BATTLEFIELD_VIEW.originX + 6 * BATTLEFIELD_VIEW.tileSize,
      y: BATTLEFIELD_VIEW.originY + 6 * BATTLEFIELD_VIEW.tileSize
    });
  });

  it("anchors active messages to their lane stations", () => {
    expect(messageWorldPosition(messageFestivalV0Map, queuedMessage)).toEqual({ x: 304, y: 238 });
    expect(messageWorldPosition(messageFestivalV0Map, processingMessage)).toEqual({ x: 368, y: 238 });
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
    ).toEqual({ x: 304, y: 238 });
    expect(
      messageWorldPosition(messageFestivalV0Map, {
        id: "expired-1",
        type: "useful",
        status: "expired",
        pathId: "path-main",
        ageTicks: 121
      })
    ).toEqual({ x: 304, y: 238 });
  });

  it("counts queued messages for queue fill", () => {
    expect(queueFillCount(snapshot)).toBe(1);
  });

  it("derives visual state for starting buildings", () => {
    expect(buildingVisualState(snapshot, startingApiGate)).toBe("accepting");
  });

  it("prefers saturated and processing snapshot building states", () => {
    const saturatedSnapshot = snapshotWith({
      buildings: [{ id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "saturated" }]
    });
    const processingSnapshot = snapshotWith({
      buildings: [{ id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "processing" }]
    });

    expect(buildingVisualState(saturatedSnapshot, startingApiGate)).toBe("saturated");
    expect(buildingVisualState(processingSnapshot, startingApiGate)).toBe("processing");
  });

  it("derives queue-hub filling from queued messages", () => {
    expect(buildingVisualState(snapshot, { defId: "queue-hub", slotId: "slot_queue_1" })).toBe("filling");
  });

  it("derives worker-yard processing from processing messages", () => {
    expect(buildingVisualState(snapshot, startingWorkerYard)).toBe("processing");
  });

  it("falls back to idle when no visual activity applies", () => {
    const idleSnapshot = snapshotWith({
      buildings: [{ id: "building-api-gate", defId: "api-gate", slotId: "slot_ingress_1", state: "idle" }],
      messages: []
    });

    expect(buildingVisualState(idleSnapshot, startingApiGate)).toBe("idle");
  });
});
