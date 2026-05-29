import { describe, expect, it } from "vitest";

import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { Command } from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";
import { hashState } from "@sim/hash";

function createPlayableGame(): GameState {
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

function finishOpeningFlow(): GameState {
  const started = step(createPlayableGame(), [{ type: "StartWave", waveId: "wave-opening-flow" }]);

  return runTicks(started, 220);
}

describe("first playable commands", () => {
  it("keeps Queue Hub placement locked before Wave 1 ends", () => {
    const next = step(createPlayableGame(), [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ]);

    expect(toSnapshot(next).buildings.map((building) => building.defId)).toEqual([
      "api-gate",
      "worker-yard"
    ]);
    expect(toSnapshot(next).meters.budget).toBe(50);
  });

  it("keeps worker tuning locked before Wave 1 ends", () => {
    const next = step(createPlayableGame(), [{ type: "SetWorkerCount", count: 2 }]);

    expect(toSnapshot(next).workerCount).toBe(1);
    expect(toSnapshot(next).meters.budget).toBe(50);
  });

  it("places Queue Hub after Wave 1 and spends its building cost", () => {
    const afterWaveOne = finishOpeningFlow();
    const placed = step(afterWaveOne, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ]);

    expect(toSnapshot(placed).buildings).toContainEqual({
      id: "queue-hub@slot_queue_1#2",
      defId: "queue-hub",
      slotId: "slot_queue_1",
      state: "idle"
    });
    expect(toSnapshot(placed).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget - 40);
  });

  it("does not spend budget twice for duplicate Queue Hub placement", () => {
    const afterWaveOne = finishOpeningFlow();
    const placed = step(afterWaveOne, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ]);
    const duplicate = step(placed, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ]);

    expect(
      toSnapshot(duplicate).buildings.filter((building) => building.defId === "queue-hub")
    ).toHaveLength(1);
    expect(toSnapshot(duplicate).meters.budget).toBe(toSnapshot(placed).meters.budget);
  });

  it("rejects Queue Hub placement on a non-queue slot", () => {
    const afterWaveOne = finishOpeningFlow();
    const next = step(afterWaveOne, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_worker_1" }
    ]);

    expect(toSnapshot(next).buildings.some((building) => building.defId === "queue-hub")).toBe(
      false
    );
    expect(toSnapshot(next).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget);
  });

  it("raises worker count after Wave 1 and spends the tuning cost once", () => {
    const afterWaveOne = finishOpeningFlow();
    const tuned = step(afterWaveOne, [{ type: "SetWorkerCount", count: 2 }]);
    const repeated = step(tuned, [{ type: "SetWorkerCount", count: 2 }]);

    expect(toSnapshot(tuned).workerCount).toBe(2);
    expect(toSnapshot(tuned).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget - 20);
    expect(toSnapshot(repeated).workerCount).toBe(2);
    expect(toSnapshot(repeated).meters.budget).toBe(toSnapshot(tuned).meters.budget);
  });

  it("blocks playable commands after the game is complete", () => {
    const afterWaveOne = finishOpeningFlow();
    const complete: GameState = { ...afterWaveOne, phase: "complete" };
    const next = step(complete, [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" },
      { type: "SetWorkerCount", count: 2 }
    ]);

    expect(toSnapshot(next).phase).toBe("complete");
    expect(toSnapshot(next).buildings).toEqual(toSnapshot(complete).buildings);
    expect(toSnapshot(next).workerCount).toBe(toSnapshot(complete).workerCount);
    expect(toSnapshot(next).meters.budget).toBe(toSnapshot(complete).meters.budget);
    expect(next.eventLog.events).not.toContainEqual(
      expect.objectContaining({ type: "building.placed" })
    );
    expect(next.eventLog.events).not.toContainEqual(
      expect.objectContaining({ type: "worker-count.changed" })
    );
  });

  it("rejects worker counts above the authored maximum", () => {
    const afterWaveOne = finishOpeningFlow();
    const next = step(afterWaveOne, [{ type: "SetWorkerCount", count: 3 }]);

    expect(toSnapshot(next).workerCount).toBe(1);
    expect(toSnapshot(next).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget);
  });

  it("rejects non-integer worker counts", () => {
    const afterWaveOne = finishOpeningFlow();
    const fractional = step(afterWaveOne, [{ type: "SetWorkerCount", count: 1.5 }]);
    const notANumber = step(afterWaveOne, [{ type: "SetWorkerCount", count: Number.NaN }]);

    expect(toSnapshot(fractional).workerCount).toBe(1);
    expect(toSnapshot(fractional).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget);
    expect(toSnapshot(notANumber).workerCount).toBe(1);
    expect(toSnapshot(notANumber).meters.budget).toBe(toSnapshot(afterWaveOne).meters.budget);
    expect(fractional.commandHistory).toHaveLength(afterWaveOne.commandHistory.length);
    expect(notANumber.commandHistory).toHaveLength(afterWaveOne.commandHistory.length);
    expect(() => hashState(notANumber)).not.toThrow();
  });

  it("keeps same-tick command order deterministic", () => {
    const afterWaveOne = finishOpeningFlow();
    const placeThenStart: readonly Command[] = [
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" },
      { type: "StartWave", waveId: "wave-flood" }
    ];
    const startThenPlace: readonly Command[] = [
      { type: "StartWave", waveId: "wave-flood" },
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ];

    expect(
      toSnapshot(step(afterWaveOne, placeThenStart)).buildings.some(
        (building) => building.defId === "queue-hub"
      )
    ).toBe(true);
    expect(
      toSnapshot(step(afterWaveOne, startThenPlace)).buildings.some(
        (building) => building.defId === "queue-hub"
      )
    ).toBe(false);
  });
});
