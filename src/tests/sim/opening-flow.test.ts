import { describe, expect, it } from "vitest";

import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

function createOpeningFlowGame(): GameState {
  return createGame(messageFestivalV0Level, 123, {
    buildingDefs: messageFestivalV0BuildingDefs,
    map: messageFestivalV0Map
  });
}

function runTicks(initial: GameState, ticks: number): GameState {
  let state = initial;

  for (let index = 0; index < ticks; index += 1) {
    state = step(state, []);
  }

  return state;
}

describe("Wave 1 Opening Flow", () => {
  it("clears all useful messages with the default preplaced system", () => {
    const started = step(createOpeningFlowGame(), [
      { type: "StartWave", waveId: "wave-opening-flow" }
    ]);
    const finished = runTicks(started, 220);
    const snapshot = toSnapshot(finished);

    expect(snapshot).toMatchObject({
      phase: "recap",
      activeWaveId: "wave-opening-flow",
      meters: {
        trust: 100,
        budget: 62,
        backlog: 0
      },
      workerCount: 1
    });
    expect(snapshot.buildings).toEqual([
      {
        id: "api-gate@slot_ingress_1#0",
        defId: "api-gate",
        slotId: "slot_ingress_1",
        state: "idle"
      },
      {
        id: "worker-yard@slot_worker_1#1",
        defId: "worker-yard",
        slotId: "slot_worker_1",
        state: "idle"
      }
    ]);
    expect(snapshot.messages).toHaveLength(12);
    expect(snapshot.messages.every((message) => message.status === "delivered")).toBe(true);
    expect(finished.completedWaveIds).toEqual(["wave-opening-flow"]);
    expect(finished.eventLog.events).toContainEqual({
      tick: expect.any(Number),
      type: "wave.ended",
      waveId: "wave-opening-flow"
    });
    expect(finished.eventLog.events).not.toContainEqual(
      expect.objectContaining({ type: "message.dropped" })
    );
  });

  it("does not unlock between-wave actions before Opening Flow ends", () => {
    const started = step(createOpeningFlowGame(), [
      { type: "StartWave", waveId: "wave-opening-flow" }
    ]);
    const duringWave = runTicks(started, 20);
    const attempted = step(duringWave, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" },
      { type: "SetWorkerCount", count: 2 }
    ]);
    const snapshot = toSnapshot(attempted);

    expect(snapshot.phase).toBe("wave");
    expect(snapshot.buildings.some((building) => building.defId === "queue-hub")).toBe(false);
    expect(snapshot.workerCount).toBe(1);
    expect(snapshot.meters.budget).toBeGreaterThanOrEqual(50);
    expect(attempted.completedWaveIds).toEqual([]);
  });
});
