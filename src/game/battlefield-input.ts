import type { Command, LevelConfig, MapDef, SimSnapshot, TowerDef } from "@content/schemas";
import { buildPadWorldPosition, type WorldPoint } from "@game/battlefield-view";

const BUILD_PAD_HITBOX_HALF_SIZE = 43;

type StartWaveCommand = Extract<Command, { type: "StartWave" }>;
type BuildTowerCommand = Extract<Command, { type: "BuildTower" }>;

export function startNextWaveCommand(snapshot: SimSnapshot): StartWaveCommand | undefined {
  if (snapshot.phase !== "setup" && snapshot.phase !== "recap") {
    return undefined;
  }

  const nextWave = snapshot.previews.nextWave;

  return nextWave ? { type: "StartWave", waveId: nextWave.waveId } : undefined;
}

export function buildPadCommandForWorldPoint(
  level: LevelConfig,
  map: MapDef,
  towerDefs: readonly TowerDef[],
  snapshot: SimSnapshot,
  point: WorldPoint
): BuildTowerCommand | undefined {
  if (snapshot.phase !== "setup" && snapshot.phase !== "recap") {
    return undefined;
  }

  const occupiedPadIds = new Set(snapshot.towers.map((tower) => tower.padId));
  const hitPads = map.buildPads
    .map((pad) => {
      const center = buildPadWorldPosition(map, pad.id);

      return { pad, center, distance: squaredDistance(center, point) };
    })
    .filter(({ center }) => isInsideBuildPadHitbox(center, point))
    .sort((left, right) => left.distance - right.distance);

  for (const { pad } of hitPads) {
    if (occupiedPadIds.has(pad.id)) {
      continue;
    }

    const towerDef = towerDefs.find(
      (candidate) =>
        level.availableTowerIds.includes(candidate.id) &&
        pad.allowedTowerKinds.includes(candidate.kind) &&
        snapshot.meters.buildBudget >= candidate.cost
    );

    if (towerDef) {
      return { type: "BuildTower", towerId: towerDef.id, padId: pad.id };
    }
  }

  return undefined;
}

function isInsideBuildPadHitbox(center: WorldPoint, point: WorldPoint): boolean {
  return (
    Math.abs(point.x - center.x) <= BUILD_PAD_HITBOX_HALF_SIZE &&
    Math.abs(point.y - center.y) <= BUILD_PAD_HITBOX_HALF_SIZE
  );
}

function squaredDistance(left: WorldPoint, right: WorldPoint): number {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}
