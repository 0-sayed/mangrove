import { describe, expect, it } from "vitest";

import {
  advanceRun,
  applyRunCommand,
  createIncreaseWorkerCountCommand,
  createInitialRun,
  getRunControls,
  queueRunCommand,
  toRunSnapshot
} from "@app/run-controller";

function finishOpeningFlow() {
  const started = applyRunCommand(createInitialRun(12345), {
    type: "StartWave",
    waveId: "wave-opening-flow"
  });

  return advanceRun(started, 240);
}

describe("run controller", () => {
  it("starts the opening wave and advances the simulator", () => {
    const initial = createInitialRun(12345);
    const started = applyRunCommand(initial, {
      type: "StartWave",
      waveId: "wave-opening-flow"
    });

    expect(toRunSnapshot(initial)).toMatchObject({
      tick: 0,
      phase: "setup"
    });
    expect(toRunSnapshot(started)).toMatchObject({
      tick: 1,
      phase: "wave",
      activeWaveId: "wave-opening-flow"
    });
  });

  it("unlocks Queue Hub, worker tuning, and Flood Wave after Opening Flow drains", () => {
    const afterOpening = finishOpeningFlow();
    const controls = getRunControls(afterOpening.game);

    expect(toRunSnapshot(afterOpening).phase).toBe("recap");
    expect(controls).toMatchObject({
      canPlaceQueueHub: true,
      canIncreaseWorkerCount: true,
      canStartNextWave: true,
      nextWaveId: "wave-flood",
      queueHubCost: 40,
      workerCount: 1,
      maxWorkerCount: 2,
      workerCountUpgradeCost: 20
    });
  });

  it("applies between-wave commands before Flood Wave starts", () => {
    const afterOpening = finishOpeningFlow();
    const floodStarted = advanceRun(
      queueRunCommand(
        queueRunCommand(
          queueRunCommand(afterOpening, {
            type: "PlaceBuilding",
            buildingId: "queue-hub",
            slotId: "slot_queue_1"
          }),
          {
            type: "SetWorkerCount",
            count: 2
          }
        ),
        {
          type: "StartWave",
          waveId: "wave-flood"
        }
      )
    );
    const snapshot = toRunSnapshot(floodStarted);

    expect(snapshot.tick).toBe(toRunSnapshot(afterOpening).tick + 1);
    expect(snapshot.phase).toBe("wave");
    expect(snapshot.activeWaveId).toBe("wave-flood");
    expect(snapshot.buildings.some((building) => building.defId === "queue-hub")).toBe(true);
    expect(snapshot.workerCount).toBe(2);
    expect(snapshot.meters.budget).toBeGreaterThanOrEqual(0);
  });

  it("reports running while wave or recap messages need ticks", () => {
    const started = applyRunCommand(createInitialRun(12345), {
      type: "StartWave",
      waveId: "wave-opening-flow"
    });
    const afterOpening = finishOpeningFlow();

    expect(getRunControls(started.game).isAutoAdvancing).toBe(true);
    expect(getRunControls(afterOpening.game).isAutoAdvancing).toBe(false);
  });

  it("creates worker tuning commands from the current worker count", () => {
    expect(createIncreaseWorkerCountCommand(2)).toEqual({
      type: "SetWorkerCount",
      count: 3
    });
  });
});
