import { describe, expect, it } from "vitest";

import {
  advanceRun,
  applyRunCommand,
  createBuildWorkerTowerCommand,
  createInitialRun,
  createStartNextWaveCommand,
  getRunControls,
  queueRunCommand,
  toRunSnapshot
} from "@app/run-controller";

describe("run controller", () => {
  it("bootstraps the authored TD level and exposes setup controls", () => {
    const initial = createInitialRun(12345);
    const snapshot = toRunSnapshot(initial);
    const controls = getRunControls(initial.game);

    expect(snapshot).toMatchObject({
      tick: 0,
      phase: "setup",
      meters: { townHealth: 20, buildBudget: 60, pressure: 0 },
      towers: [],
      enemies: []
    });
    expect(controls).toMatchObject({
      phaseLabel: "Build",
      activeWaveLabel: "Awaiting wave",
      nextWaveId: "wave-normal-flow",
      nextWaveLabel: "Normal Flow",
      canStartNextWave: true,
      canBuildWorkerTower: true,
      workerTowerCost: 30,
      isAutoAdvancing: false
    });
  });

  it("creates TD build and start-wave commands", () => {
    const controls = getRunControls(createInitialRun(12345).game);

    expect(createBuildWorkerTowerCommand()).toEqual({
      type: "BuildTower",
      towerId: "worker-tower",
      padId: "pad-worker-a"
    });
    expect(createStartNextWaveCommand(controls)).toEqual({
      type: "StartWave",
      waveId: "wave-normal-flow"
    });
  });

  it("applies queued TD commands to build a tower and start the wave", () => {
    const initial = createInitialRun(12345);
    const started = advanceRun(
      queueRunCommand(
        queueRunCommand(initial, createBuildWorkerTowerCommand()),
        createStartNextWaveCommand(getRunControls(initial.game))
      )
    );
    const snapshot = toRunSnapshot(started);

    expect(snapshot.phase).toBe("wave");
    expect(snapshot.activeWaveId).toBe("wave-normal-flow");
    expect(snapshot.towers).toEqual([
      {
        id: "worker-tower@pad-worker-a#0",
        towerId: "worker-tower",
        padId: "pad-worker-a",
        cooldownRemainingTicks: 0
      }
    ]);
    expect(snapshot.meters.buildBudget).toBe(30);
  });

  it("allows worker tower builds from recap controls", () => {
    const initial = createInitialRun(12345);

    expect(
      getRunControls({
        ...initial.game,
        phase: "recap",
        completedWaveIds: ["wave-normal-flow"]
      }).canBuildWorkerTower
    ).toBe(true);
  });

  it("reports auto-advance only while an authored wave is running", () => {
    const started = applyRunCommand(createInitialRun(12345), {
      type: "StartWave",
      waveId: "wave-normal-flow"
    });
    const completed = advanceRun(started, 92);

    expect(getRunControls(started.game).isAutoAdvancing).toBe(true);
    expect(toRunSnapshot(completed).phase).toBe("recap");
    expect(getRunControls(completed.game)).toMatchObject({
      nextWaveId: "wave-burst-surge",
      nextWaveLabel: "Burst Surge",
      isAutoAdvancing: false
    });
  });
});
