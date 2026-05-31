import { describe, expect, it } from "vitest";

import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs
} from "@content/td-contract-fixture";
import type { Command } from "@content/schemas";
import { runReplay, type ReplayCommand } from "@sim/replay";

const replayOptions = {
  towerDefs: tdContractFixtureTowerDefs,
  enemyDefs: tdContractFixtureEnemyDefs,
  map: tdContractFixtureMap
};

describe("TD sim replay", () => {
  it("replays the same command log to the same terminal hash", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 0, command: { type: "SetBuildIntent", towerId: "worker-tower" } },
      { tick: 1, command: { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" } },
      { tick: 2, command: { type: "StartWave", waveId: "wave-normal-flow" } }
    ];

    const first = runReplay({ config: tdContractFixtureLevel, seed: 123, ticks: 57, commandLog, ...replayOptions });
    const second = runReplay({ config: tdContractFixtureLevel, seed: 123, ticks: 57, commandLog, ...replayOptions });

    expect(first.hash).toBe(second.hash);
    expect(first.state).toEqual(second.state);
    expect(first.state.phase).toBe("complete");
    expect(first.state.meters.townHealth).toBe(17);
  });

  it("replays active enemy movement deterministically before leaks", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 1, command: { type: "StartWave", waveId: "wave-normal-flow" } }
    ];

    const first = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 6,
      commandLog,
      ...replayOptions
    });
    const second = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 6,
      commandLog,
      ...replayOptions
    });

    expect(first.hash).toBe(second.hash);
    expect(first.state.enemies).toEqual(second.state.enemies);
    expect(first.state.enemies[0]).toMatchObject({
      id: "enemy:wave-normal-flow:0:0",
      enemyId: "request-runner",
      pathId: "road-main",
      status: "active"
    });
    expect(first.state.enemies[0]?.progress).toBeCloseTo(1 / 3, 6);
  });

  it("keeps command order as part of deterministic input", () => {
    const setIntent: Command = { type: "SetBuildIntent", towerId: "worker-tower" };
    const clearIntent: Command = { type: "ClearBuildIntent" };

    const first = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 1,
      commandLog: [
        { tick: 0, command: setIntent },
        { tick: 0, command: clearIntent }
      ],
      ...replayOptions
    });
    const second = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 1,
      commandLog: [
        { tick: 0, command: clearIntent },
        { tick: 0, command: setIntent }
      ],
      ...replayOptions
    });

    expect(first.hash).not.toBe(second.hash);
  });

  it("does not scan the full command log for every tick", () => {
    const commandLog = new Proxy<ReplayCommand[]>(
      [{ tick: 0, command: { type: "StartWave", waveId: "wave-normal-flow" } }],
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
      runReplay({ config: tdContractFixtureLevel, seed: 123, ticks: 3, commandLog, ...replayOptions })
    ).not.toThrow();
  });

  it("replays with tower definitions, enemy definitions, and map deterministically", () => {
    const commandLog: readonly ReplayCommand[] = [
      { tick: 0, command: { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" } },
      { tick: 1, command: { type: "StartWave", waveId: "wave-normal-flow" } }
    ];

    const first = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 4,
      commandLog,
      ...replayOptions
    });
    const second = runReplay({
      config: tdContractFixtureLevel,
      seed: 123,
      ticks: 4,
      commandLog,
      ...replayOptions
    });

    expect(first.hash).toBe(second.hash);
    expect(first.state).toEqual(second.state);
    expect(first.state.towers).toEqual([
      {
        id: "worker-tower@pad-worker-a#0",
        towerId: "worker-tower",
        padId: "pad-worker-a",
        cooldownRemainingTicks: 0
      }
    ]);
  });

  it("rejects negative replay duration", () => {
    expect(() =>
      runReplay({ config: tdContractFixtureLevel, seed: 123, ticks: -1, commandLog: [], ...replayOptions })
    ).toThrow("non-negative integer");
  });
});
