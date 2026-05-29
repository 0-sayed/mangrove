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
