import { describe, expect, it } from "vitest";

import {
  apiGateDef,
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map,
  queueHubDef,
  workerYardDef
} from "@content/message-festival-v0";
import { validateBuildingDef, validateLevelConfig, validateMapMetadata } from "@content/schemas";

function totalSpawned(waveId: string): number {
  const wave = messageFestivalV0Level.waves.find((candidate) => candidate.id === waveId);

  if (!wave) {
    throw new Error(`Missing wave ${waveId}`);
  }

  return wave.spawnSchedule.reduce((total, item) => total + item.count, 0);
}

describe("Message Festival v0 content", () => {
  it("validates the authored level, map, and buildings", () => {
    expect(validateLevelConfig(messageFestivalV0Level).ok).toBe(true);
    expect(validateMapMetadata(messageFestivalV0Map).ok).toBe(true);

    for (const buildingDef of messageFestivalV0BuildingDefs) {
      expect(validateBuildingDef(buildingDef).ok).toBe(true);
    }
  });

  it("starts with API Gate and Worker Yard preplaced", () => {
    expect(messageFestivalV0Level.startingBuildings).toEqual([
      { defId: "api-gate", slotId: "slot_ingress_1" },
      { defId: "worker-yard", slotId: "slot_worker_1" }
    ]);
  });

  it("offers only Queue Hub as a placeable building choice", () => {
    expect(messageFestivalV0Level.availableBuildings).toEqual(["queue-hub"]);
  });

  it("authors the first playable building tuning", () => {
    expect(apiGateDef.stats).toMatchObject({
      acceptPerSecond: 3,
      directHandoffCapacity: 4,
      messagePatienceTicks: 120
    });
    expect(queueHubDef.cost).toBe(40);
    expect(queueHubDef.stats.capacity).toBe(24);
    expect(workerYardDef.stats).toMatchObject({
      processingTicks: 10,
      messagesPerWorkerPerSecond: 1,
      maxWorkers: 2,
      workerCountUpgradeCost: 20
    });
  });

  it("authors the two first playable wave totals", () => {
    expect(totalSpawned("wave-opening-flow")).toBe(12);
    expect(totalSpawned("wave-flood")).toBe(48);
  });

  it("authors Wave 1 Opening Flow as a calm observation wave", () => {
    const openingFlow = messageFestivalV0Level.waves.find(
      (wave) => wave.id === "wave-opening-flow"
    );

    expect(openingFlow).toEqual({
      id: "wave-opening-flow",
      durationTicks: 200,
      timeoutTicks: 300,
      spawnSchedule: [
        { tick: 0, messageType: "useful", count: 1 },
        { tick: 16, messageType: "useful", count: 1 },
        { tick: 32, messageType: "useful", count: 1 },
        { tick: 48, messageType: "useful", count: 1 },
        { tick: 64, messageType: "useful", count: 1 },
        { tick: 80, messageType: "useful", count: 1 },
        { tick: 96, messageType: "useful", count: 1 },
        { tick: 112, messageType: "useful", count: 1 },
        { tick: 128, messageType: "useful", count: 1 },
        { tick: 144, messageType: "useful", count: 1 },
        { tick: 160, messageType: "useful", count: 1 },
        { tick: 176, messageType: "useful", count: 1 }
      ],
      messageTypes: ["useful"],
      recapId: "recap-opening-flow"
    });
  });

  it("authors Wave 2 Flood Wave as burst pressure", () => {
    const floodWave = messageFestivalV0Level.waves.find((wave) => wave.id === "wave-flood");
    const floodRecap = messageFestivalV0Level.recaps.find((recap) => recap.id === "recap-flood");

    expect(floodWave).toEqual({
      id: "wave-flood",
      durationTicks: 160,
      timeoutTicks: 700,
      spawnSchedule: [
        { tick: 0, messageType: "useful", count: 3 },
        { tick: 10, messageType: "useful", count: 3 },
        { tick: 20, messageType: "useful", count: 3 },
        { tick: 30, messageType: "useful", count: 3 },
        { tick: 40, messageType: "useful", count: 3 },
        { tick: 50, messageType: "useful", count: 3 },
        { tick: 60, messageType: "useful", count: 3 },
        { tick: 70, messageType: "useful", count: 3 },
        { tick: 80, messageType: "useful", count: 3 },
        { tick: 90, messageType: "useful", count: 3 },
        { tick: 100, messageType: "useful", count: 3 },
        { tick: 110, messageType: "useful", count: 3 },
        { tick: 120, messageType: "useful", count: 3 },
        { tick: 130, messageType: "useful", count: 3 },
        { tick: 140, messageType: "useful", count: 3 },
        { tick: 150, messageType: "useful", count: 3 }
      ],
      messageTypes: ["useful"],
      recapId: "recap-flood"
    });
    expect(floodRecap).toEqual({
      id: "recap-flood",
      lines: [
        "Queue Hub absorbs bursts before workers are ready.",
        "Backlog still peaks when workers process too slowly.",
        "Queue: absorbs bursts, but does not create worker capacity."
      ]
    });
  });

  it("unlocks Queue Hub placement and worker tuning after Wave 1", () => {
    expect(messageFestivalV0Level.unlocks).toEqual([
      {
        afterWaveId: "wave-opening-flow",
        buildingIds: ["queue-hub"],
        commandTypes: ["PlaceBuilding", "SetWorkerCount"]
      }
    ]);
  });

  it("keeps recap copy within the first playable limit", () => {
    expect(messageFestivalV0Level.recaps).toHaveLength(2);

    for (const recap of messageFestivalV0Level.recaps) {
      expect(recap.lines.length).toBeGreaterThanOrEqual(1);
      expect(recap.lines.length).toBeLessThanOrEqual(3);
    }
  });
});
