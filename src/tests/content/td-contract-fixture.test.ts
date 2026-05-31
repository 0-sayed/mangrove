import { describe, expect, it } from "vitest";

import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs
} from "@content/td-contract-fixture";
import { validateEnemyDef, validateLevelConfig, validateMapDef, validateTowerDef } from "@content/schemas";

describe("TD contract fixture", () => {
  it("is valid contract fixture content", () => {
    expect(validateLevelConfig(tdContractFixtureLevel).ok).toBe(true);
    expect(validateMapDef(tdContractFixtureMap).ok).toBe(true);

    for (const towerDef of tdContractFixtureTowerDefs) {
      expect(validateTowerDef(towerDef).ok).toBe(true);
    }

    for (const enemyDef of tdContractFixtureEnemyDefs) {
      expect(validateEnemyDef(enemyDef).ok).toBe(true);
    }
  });

  it("keeps fixture scope below authored TD004 content", () => {
    expect(tdContractFixtureLevel.waves).toHaveLength(1);
    expect(tdContractFixtureTowerDefs).toHaveLength(1);
    expect(tdContractFixtureEnemyDefs).toHaveLength(1);
  });

  it("keeps level, map, tower, enemy, wave, and recap references aligned", () => {
    const mapIds = new Set([tdContractFixtureMap.id]);
    const towerIds = new Set(tdContractFixtureTowerDefs.map((towerDef) => towerDef.id));
    const enemyIds = new Set(tdContractFixtureEnemyDefs.map((enemyDef) => enemyDef.id));
    const pathIds = new Set(tdContractFixtureMap.paths.map((path) => path.id));
    const waveIds = new Set(tdContractFixtureLevel.waves.map((wave) => wave.id));

    expect(mapIds.has(tdContractFixtureLevel.mapId)).toBe(true);

    for (const towerId of tdContractFixtureLevel.availableTowerIds) {
      expect(towerIds.has(towerId)).toBe(true);
    }

    for (const wave of tdContractFixtureLevel.waves) {
      for (const spawn of wave.spawns) {
        expect(enemyIds.has(spawn.enemyId)).toBe(true);
        expect(pathIds.has(spawn.pathId)).toBe(true);
      }
    }

    for (const recapLaw of tdContractFixtureLevel.recapLaws) {
      expect(waveIds.has(recapLaw.afterWaveId)).toBe(true);
    }
  });
});
