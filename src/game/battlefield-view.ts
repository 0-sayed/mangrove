import type { MapDef, SimSnapshot, TowerDef } from "@content/schemas";

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export const BATTLEFIELD_VIEW = {
  width: 1280,
  height: 720,
  tileSize: 72,
  originX: 150,
  originY: 10
} as const;

function gridToWorld(point: Pick<WorldPoint, "x" | "y">): WorldPoint {
  return {
    x: BATTLEFIELD_VIEW.originX + point.x * BATTLEFIELD_VIEW.tileSize,
    y: BATTLEFIELD_VIEW.originY + point.y * BATTLEFIELD_VIEW.tileSize
  };
}

export function pathWorldPoints(map: MapDef, pathId: string): WorldPoint[] {
  const path = map.paths.find((candidate) => candidate.id === pathId);

  if (!path) {
    throw new Error(`Missing map path ${pathId}`);
  }

  const points = path.points.map(gridToWorld);

  if (points.length < 2) {
    throw new Error(`Path ${pathId} must resolve to at least two visible points`);
  }

  return points;
}

export function buildPadWorldPosition(map: MapDef, padId: string): WorldPoint {
  const pad = map.buildPads.find((candidate) => candidate.id === padId);

  if (!pad) {
    throw new Error(`Missing build pad ${padId}`);
  }

  return gridToWorld(pad);
}

export function battlefieldTowers(
  snapshot: SimSnapshot
): readonly SimSnapshot["towers"][number][] {
  return snapshot.towers;
}

export function towerBodyAnimationId(def: Pick<TowerDef, "kind"> | undefined): string {
  if (def?.kind === "worker") {
    return "building-worker-tower-idle";
  }

  if (def?.kind === "queue") {
    return "building-queue-tower-empty";
  }

  return "building-ingress-tower-flowing";
}

export function activeEnemySprites(): readonly SimSnapshot["enemies"][number][] {
  return [];
}
