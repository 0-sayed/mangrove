import { describe, expect, it } from "vitest";

import { bootstrapLevel } from "@content/bootstrap-level";
import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { Command } from "@content/schemas";
import { runReplay, type ReplayCommand } from "@sim/replay";

describe("sim replay", () => {
  it("replays the same command log to the same terminal hash", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 0, command: { type: "StartWave", waveId: "opening-flow" } },
      { tick: 2, command: { type: "SetWorkerCount", count: 2 } }
    ];

    const first = runReplay({ config: bootstrapLevel, seed: 123, ticks: 5, commandLog });
    const second = runReplay({ config: bootstrapLevel, seed: 123, ticks: 5, commandLog });

    expect(first.hash).toBe(second.hash);
    expect(first.state).toEqual(second.state);
  });

  it("keeps command order as part of deterministic input", () => {
    const startWave: Command = { type: "StartWave", waveId: "opening-flow" };
    const setWorkerCount: Command = { type: "SetWorkerCount", count: 2 };

    const first = runReplay({
      config: bootstrapLevel,
      seed: 123,
      ticks: 1,
      commandLog: [
        { tick: 0, command: startWave },
        { tick: 0, command: setWorkerCount }
      ]
    });
    const second = runReplay({
      config: bootstrapLevel,
      seed: 123,
      ticks: 1,
      commandLog: [
        { tick: 0, command: setWorkerCount },
        { tick: 0, command: startWave }
      ]
    });

    expect(first.hash).not.toBe(second.hash);
  });

  it("does not scan the full command log for every tick", () => {
    const commandLog = new Proxy<ReplayCommand[]>(
      [{ tick: 0, command: { type: "StartWave", waveId: "opening-flow" } }],
      {
        get(target, property, receiver) {
          if (property === "filter") {
            throw new Error("Replay command log must be indexed before ticking.");
          }

          return Reflect.get(target, property, receiver);
        }
      }
    );

    expect(() =>
      runReplay({ config: bootstrapLevel, seed: 123, ticks: 3, commandLog })
    ).not.toThrow();
  });

  it("replays lifecycle ticks with building definitions deterministically", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 0, command: { type: "StartWave", waveId: "wave-opening-flow" } }
    ];

    const first = runReplay({
      config: messageFestivalV0Level,
      seed: 123,
      ticks: 30,
      commandLog,
      buildingDefs: messageFestivalV0BuildingDefs,
      map: messageFestivalV0Map
    });
    const second = runReplay({
      config: messageFestivalV0Level,
      seed: 123,
      ticks: 30,
      commandLog,
      buildingDefs: messageFestivalV0BuildingDefs,
      map: messageFestivalV0Map
    });

    expect(first.hash).toBe(second.hash);
    expect(first.state).toEqual(second.state);
  });

  it("replays first playable commands deterministically", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 0, command: { type: "StartWave", waveId: "wave-opening-flow" } },
      {
        tick: 221,
        command: { type: "PlaceBuilding", buildingId: "queue-hub", slotId: "slot_queue_1" }
      },
      { tick: 222, command: { type: "SetWorkerCount", count: 2 } },
      { tick: 223, command: { type: "StartWave", waveId: "wave-flood" } }
    ];

    const first = runReplay({
      config: messageFestivalV0Level,
      seed: 123,
      ticks: 260,
      commandLog,
      buildingDefs: messageFestivalV0BuildingDefs,
      map: messageFestivalV0Map
    });
    const second = runReplay({
      config: messageFestivalV0Level,
      seed: 123,
      ticks: 260,
      commandLog,
      buildingDefs: messageFestivalV0BuildingDefs,
      map: messageFestivalV0Map
    });

    expect(first.hash).toBe(second.hash);
    expect(first.state).toEqual(second.state);
    expect(first.state.buildings.some((building) => building.defId === "queue-hub")).toBe(true);
    expect(first.state.workerCount).toBe(2);
  });

  it("rejects negative replay duration", () => {
    expect(() =>
      runReplay({ config: bootstrapLevel, seed: 123, ticks: -1, commandLog: [] })
    ).toThrow("non-negative integer");
  });
});
