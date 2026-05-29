import { describe, expect, it } from "vitest";

import { bootstrapLevel } from "@content/bootstrap-level";
import type { Command } from "@content/schemas";
import { validateSimSnapshot } from "@content/schemas";
import { createGame, step, toSnapshot } from "@sim/game";

describe("deterministic simulator core", () => {
  it("creates setup state from level starting state", () => {
    const state = createGame(bootstrapLevel, 123);
    const snapshot = toSnapshot(state);

    expect(snapshot).toEqual({
      tick: 0,
      phase: "setup",
      meters: {
        trust: 100,
        budget: 50,
        backlog: 0
      },
      buildings: [],
      messages: [],
      lanePressure: [],
      alerts: [],
      workerCount: 1
    });
    expect(validateSimSnapshot(snapshot).ok).toBe(true);
  });

  it("creates deterministic building ids from starting buildings", () => {
    const state = createGame(
      {
        ...bootstrapLevel,
        startingBuildings: [
          { defId: "api-gate-basic", slotId: "slot-api-1" },
          { defId: "worker-yard-basic", slotId: "slot-worker-1" }
        ]
      },
      123
    );

    expect(toSnapshot(state).buildings).toEqual([
      { id: "api-gate-basic@slot-api-1#0", defId: "api-gate-basic", slotId: "slot-api-1", state: "idle" },
      { id: "worker-yard-basic@slot-worker-1#1", defId: "worker-yard-basic", slotId: "slot-worker-1", state: "idle" }
    ]);
  });

  it("returns snapshot building objects that cannot mutate simulator state", () => {
    const state = createGame(
      {
        ...bootstrapLevel,
        startingBuildings: [{ defId: "api-gate-basic", slotId: "slot-api-1" }]
      },
      123
    );
    const expectedBuilding = {
      id: "api-gate-basic@slot-api-1#0",
      defId: "api-gate-basic",
      slotId: "slot-api-1",
      state: "idle"
    };
    const snapshot = toSnapshot(state);
    const snapshotBuilding = snapshot.buildings[0];

    if (!snapshotBuilding) {
      throw new Error("Expected a snapshot building.");
    }

    snapshotBuilding.state = "mutated-by-renderer";

    expect(state.buildings[0]).toEqual(expectedBuilding);
    expect(toSnapshot(state).buildings[0]).toEqual(expectedBuilding);
  });

  it("advances exactly one fixed tick and records commands for the input tick", () => {
    const command: Command = { type: "StartWave", waveId: "opening-flow" };
    const initial = createGame(bootstrapLevel, 123);
    const next = step(initial, [command]);

    expect(next.tick).toBe(1);
    expect(next.commandHistory).toEqual([{ tick: 0, command }]);
    expect(next.eventLog.events.at(-1)).toEqual({
      tick: 0,
      type: "command.received",
      message: "StartWave"
    });
  });

  it("records command history as stable snapshots", () => {
    const command: Command = { type: "StartWave", waveId: "opening-flow" };
    const initial = createGame(bootstrapLevel, 123);
    const next = step(initial, [command]);

    command.waveId = "mutated-after-step";

    expect(next.commandHistory).toEqual([{ tick: 0, command: { type: "StartWave", waveId: "opening-flow" } }]);
    expect(next.commandHistory[0]?.command).not.toBe(command);
  });

  it("does not mutate previous state when stepping", () => {
    const initial = createGame(bootstrapLevel, 123);
    const next = step(initial, [{ type: "SetWorkerCount", count: 2 }]);

    expect(initial.tick).toBe(0);
    expect(initial.commandHistory).toEqual([]);
    expect(next.tick).toBe(1);
    expect(next.commandHistory).toHaveLength(1);
  });
});
