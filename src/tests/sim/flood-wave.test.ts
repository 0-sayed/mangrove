import { describe, expect, it } from "vitest";

import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { Command } from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

const OPENING_FLOW_ID = "wave-opening-flow";
const FLOOD_WAVE_ID = "wave-flood";

interface FloodRunResult {
  readonly state: GameState;
  readonly backlogPeak: number;
}

function runTicks(initial: GameState, ticks: number): FloodRunResult {
  let state = initial;
  let backlogPeak = toSnapshot(state).meters.backlog;

  for (let index = 0; index < ticks; index += 1) {
    state = step(state, []);
    backlogPeak = Math.max(backlogPeak, toSnapshot(state).meters.backlog);
  }

  return { state, backlogPeak };
}

function createPlayableGame(): GameState {
  return createGame(messageFestivalV0Level, 123, {
    buildingDefs: messageFestivalV0BuildingDefs,
    map: messageFestivalV0Map
  });
}

function finishOpeningFlow(): GameState {
  const started = step(createPlayableGame(), [{ type: "StartWave", waveId: OPENING_FLOW_ID }]);

  return runTicks(started, 240).state;
}

function runFloodWave(commands: readonly Command[]): FloodRunResult {
  const afterOpening = finishOpeningFlow();
  const startedFlood = step(afterOpening, [...commands, { type: "StartWave", waveId: FLOOD_WAVE_ID }]);

  return runTicks(startedFlood, 720);
}

function floodMessages(state: GameState) {
  return toSnapshot(state).messages.filter((message) => message.id.startsWith(`${FLOOD_WAVE_ID}-`));
}

function countFloodMessages(state: GameState, status: "delivered" | "dropped" | "expired"): number {
  return floodMessages(state).filter((message) => message.status === status).length;
}

function countDropEvents(state: GameState, reason: "direct-handoff-overflow" | "queue-overflow"): number {
  return state.eventLog.events.filter(
    (event) => event.type === "message.dropped" && event.reason === reason
  ).length;
}

describe("Wave 2 Flood Wave", () => {
  it("does not start flood wave before opening flow is complete", () => {
    const initial = createPlayableGame();
    const attempted = step(initial, [{ type: "StartWave", waveId: FLOOD_WAVE_ID }]);
    const snapshot = toSnapshot(attempted);

    expect(snapshot).toMatchObject({
      phase: "setup"
    });
    expect(snapshot.activeWaveId).toBeUndefined();
    expect(attempted.completedWaveIds).toEqual([]);
    expect(attempted.eventLog.events).not.toContainEqual({
      tick: initial.tick,
      type: "wave.started",
      waveId: FLOOD_WAVE_ID
    });
  });

  it("punishes direct handoff only with visible drops and a failed trust outcome", () => {
    const { state, backlogPeak } = runFloodWave([]);
    const snapshot = toSnapshot(state);

    expect(snapshot).toMatchObject({
      phase: "complete",
      activeWaveId: FLOOD_WAVE_ID,
      meters: {
        backlog: 0
      }
    });
    expect(state.completedWaveIds).toEqual([OPENING_FLOW_ID, FLOOD_WAVE_ID]);
    expect(floodMessages(state)).toHaveLength(48);
    expect(countFloodMessages(state, "dropped")).toBeGreaterThan(0);
    expect(countDropEvents(state, "direct-handoff-overflow")).toBeGreaterThan(0);
    expect(countDropEvents(state, "queue-overflow")).toBe(0);
    expect(snapshot.meters.trust).toBeLessThan(70);
    expect(backlogPeak).toBeGreaterThan(0);
  });

  it("uses Queue Hub to reduce drops while showing slow drain risk", () => {
    const direct = runFloodWave([]);
    const queueOnly = runFloodWave([
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
    ]);
    const directSnapshot = toSnapshot(direct.state);
    const queueSnapshot = toSnapshot(queueOnly.state);

    expect(queueSnapshot.phase).toBe("complete");
    expect(queueSnapshot.buildings).toContainEqual({
      id: "queue-hub@slot_queue_1#2",
      defId: "queue-hub",
      slotId: "slot_queue_1",
      state: "idle"
    });
    expect(countFloodMessages(queueOnly.state, "dropped")).toBeLessThan(
      countFloodMessages(direct.state, "dropped")
    );
    expect(countDropEvents(queueOnly.state, "direct-handoff-overflow")).toBe(0);
    expect(countDropEvents(queueOnly.state, "queue-overflow")).toBeGreaterThan(0);
    expect(queueOnly.backlogPeak).toBeGreaterThan(direct.backlogPeak);
    expect(queueSnapshot.meters.trust).toBeGreaterThan(directSnapshot.meters.trust);
    expect(queueSnapshot.meters.trust).toBeLessThan(85);
  });

  it("lets Queue Hub plus two workers cleanly survive and drain the backlog", () => {
    const { state, backlogPeak } = runFloodWave([
      { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" },
      { type: "SetWorkerCount", count: 2 }
    ]);
    const snapshot = toSnapshot(state);

    expect(snapshot).toMatchObject({
      phase: "complete",
      activeWaveId: FLOOD_WAVE_ID,
      workerCount: 2,
      meters: {
        trust: 100,
        budget: 50,
        backlog: 0
      }
    });
    expect(state.completedWaveIds).toEqual([OPENING_FLOW_ID, FLOOD_WAVE_ID]);
    expect(floodMessages(state)).toHaveLength(48);
    expect(countFloodMessages(state, "delivered")).toBe(48);
    expect(countFloodMessages(state, "dropped")).toBe(0);
    expect(countFloodMessages(state, "expired")).toBe(0);
    expect(countDropEvents(state, "direct-handoff-overflow")).toBe(0);
    expect(countDropEvents(state, "queue-overflow")).toBe(0);
    expect(backlogPeak).toBeGreaterThan(0);
  });
});
