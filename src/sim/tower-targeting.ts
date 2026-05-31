import type { ConnectionPreview, EnemyDef, MapDef, SimSnapshot, TowerDef } from "@content/schemas";
import { pathIdsCoveredByPad, sharedPortalCorePathIds } from "@sim/path-geometry";

export const QUEUE_SNARE_CAPACITY = 3;
export const QUEUE_SNARE_DURATION_TICKS = 6;
export const TOWER_DEFAULT_PROJECTILE_PROGRESS = 1;

type SnapshotTower = SimSnapshot["towers"][number];
type SnapshotEnemy = SimSnapshot["enemies"][number];
type TargetTag = TowerDef["targets"][number];
type TowerDefsById = Readonly<Record<string, TowerDef>>;

export function enemyMatchesTowerTargets(enemyDef: EnemyDef, targets: readonly TargetTag[]): boolean {
  return targets.some((target) => {
    if (target === "ground") {
      return true;
    }

    if (target === "swarm") {
      return enemyDef.kind === "burst-swarm" || enemyDef.traits.includes("swarm");
    }

    return enemyDef.kind === "heavy-payload" || enemyDef.traits.includes("heavy");
  });
}

export function coveredPathIdsForTower(map: MapDef, tower: SnapshotTower, towerDef: TowerDef): string[] {
  const pad = map.buildPads.find((candidate) => candidate.id === tower.padId);

  if (!pad) {
    return [];
  }

  return pathIdsCoveredByPad(map, { x: pad.x, y: pad.y }, towerDef.range);
}

export function scorePathCoverage({
  map,
  pathId,
  towers,
  towerDefsById,
  enemies
}: {
  readonly map: MapDef;
  readonly pathId: string;
  readonly towers: readonly SnapshotTower[];
  readonly towerDefsById: TowerDefsById;
  readonly enemies: readonly SnapshotEnemy[];
}): number {
  const coverageScore = towers.reduce((score, tower) => {
    const towerDef = towerDefsById[tower.towerId];

    if (!towerDef || !coveredPathIdsForTower(map, tower, towerDef).includes(pathId)) {
      return score;
    }

    if (towerDef.kind === "worker") {
      return score + towerDef.combat.damage * (100 / towerDef.combat.cooldownTicks);
    }

    if (towerDef.kind === "queue") {
      return score + 1.5;
    }

    return score;
  }, 0);

  const activePressure = enemies.filter((enemy) => enemy.status === "active" && enemy.pathId === pathId).length;

  return coverageScore - activePressure;
}

export function healthiestPathId({
  map,
  pathId,
  candidatePathIds,
  towers,
  towerDefsById,
  enemies
}: {
  readonly map: MapDef;
  readonly pathId: string;
  readonly candidatePathIds: readonly string[];
  readonly towers: readonly SnapshotTower[];
  readonly towerDefsById: TowerDefsById;
  readonly enemies: readonly SnapshotEnemy[];
}): string {
  if (candidatePathIds.length === 0) {
    return pathId;
  }

  return candidatePathIds.reduce((bestPathId, candidatePathId) => {
    const bestScore = scorePathCoverage({ map, pathId: bestPathId, towers, towerDefsById, enemies });
    const candidateScore = scorePathCoverage({ map, pathId: candidatePathId, towers, towerDefsById, enemies });

    return candidateScore > bestScore ? candidatePathId : bestPathId;
  }, candidatePathIds[0] ?? pathId);
}

export function routeCandidatePathIds(map: MapDef, pathId: string): string[] {
  return sharedPortalCorePathIds(map, pathId);
}

function routeInfluencePathIds(map: MapDef, coveredPathIds: readonly string[]): string[] {
  const coveredPathIdSet = new Set(coveredPathIds);
  const routablePathIds = new Set<string>();

  for (const pathId of coveredPathIds) {
    const candidatePathIds = routeCandidatePathIds(map, pathId);

    if (
      candidatePathIds.length >= 2 &&
      candidatePathIds.every((candidatePathId) => coveredPathIdSet.has(candidatePathId))
    ) {
      for (const candidatePathId of candidatePathIds) {
        routablePathIds.add(candidatePathId);
      }
    }
  }

  return Array.from(routablePathIds);
}

export function deriveConnectionPreviews({
  map,
  towers,
  towerDefsById,
  enemies
}: {
  readonly map: MapDef;
  readonly towers: readonly SnapshotTower[];
  readonly towerDefsById: TowerDefsById;
  readonly enemies: readonly SnapshotEnemy[];
}): ConnectionPreview[] {
  const previews: ConnectionPreview[] = [];

  for (const tower of towers) {
    const towerDef = towerDefsById[tower.towerId];

    if (!towerDef) {
      continue;
    }

    const coveredPathIds = coveredPathIdsForTower(map, tower, towerDef);

    if (towerDef.kind === "queue") {
      const workerTargetIds = towers
        .filter((candidate) => {
          const candidateDef = towerDefsById[candidate.towerId];

          return (
            candidateDef?.kind === "worker" &&
            coveredPathIdsForTower(map, candidate, candidateDef).some((pathId) => coveredPathIds.includes(pathId))
          );
        })
        .map((candidate) => candidate.id);

      if (workerTargetIds.length > 0) {
        previews.push({ sourceId: tower.id, targetIds: workerTargetIds, kind: "stall-window" });
      }

      const stalledEnemyCount = enemies.filter(
        (enemy) =>
          enemy.status === "active" &&
          (enemy.stallRemainingTicks ?? 0) > 0 &&
          coveredPathIds.includes(enemy.pathId)
      ).length;

      if (stalledEnemyCount >= QUEUE_SNARE_CAPACITY) {
        previews.push({ sourceId: tower.id, targetIds: coveredPathIds, kind: "overload-warning" });
      }
    }

    if (towerDef.kind === "load-balancer") {
      const candidatePathIds = routeInfluencePathIds(map, coveredPathIds);

      if (candidatePathIds.length > 0) {
        previews.push({ sourceId: tower.id, targetIds: candidatePathIds, kind: "route-influence" });
      }
    }
  }

  for (const path of map.paths) {
    const pathScore = scorePathCoverage({ map, pathId: path.id, towers, towerDefsById, enemies });
    const candidatePathIds = routeCandidatePathIds(map, path.id);
    const strongestPathScore = candidatePathIds.reduce(
      (bestScore, candidatePathId) =>
        Math.max(bestScore, scorePathCoverage({ map, pathId: candidatePathId, towers, towerDefsById, enemies })),
      pathScore
    );

    if (towers.length > 0 && (pathScore <= 0 || pathScore < strongestPathScore)) {
      previews.push({ sourceId: path.id, targetIds: [path.id], kind: "weak-coverage" });
    }
  }

  return previews;
}
