import { describe, expect, it } from "vitest";

import { bootstrapLevel } from "@content/bootstrap-level";
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

    expect(() => runReplay({ config: bootstrapLevel, seed: 123, ticks: 3, commandLog })).not.toThrow();
  });

  it("rejects negative replay duration", () => {
    expect(() => runReplay({ config: bootstrapLevel, seed: 123, ticks: -1, commandLog: [] })).toThrow(
      "non-negative integer"
    );
  });
});
