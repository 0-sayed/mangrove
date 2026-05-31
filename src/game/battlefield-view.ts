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

function gridToWorldX(gridX: number): number {
  return BATTLEFIELD_VIEW.originX + gridX * BATTLEFIELD_VIEW.tileSize;
}

function gridToWorldY(gridY: number): number {
  return BATTLEFIELD_VIEW.originY + gridY * BATTLEFIELD_VIEW.tileSize;
}

function distanceBetweenGridPoints(
  start: Pick<WorldPoint, "x" | "y">,
  end: Pick<WorldPoint, "x" | "y">
): number {
  return Math.hypot(
    gridToWorldX(end.x) - gridToWorldX(start.x),
    gridToWorldY(end.y) - gridToWorldY(start.y)
  );
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

export function enemyWorldPosition(map: MapDef, pathId: string, progress: number): WorldPoint {
  const path = map.paths.find((candidate) => candidate.id === pathId);

  if (!path) {
    throw new Error(`Missing map path ${pathId}`);
  }

  if (path.points.length < 2) {
    throw new Error(`Path ${pathId} must resolve to at least two visible points`);
  }

  const clampedProgress = Math.min(1, Math.max(0, progress));
  let totalLength = 0;

  for (let index = 0; index < path.points.length - 1; index += 1) {
    const start = path.points[index];
    const end = path.points[index + 1];

    if (start && end) {
      totalLength += distanceBetweenGridPoints(start, end);
    }
  }

  let remaining = clampedProgress * totalLength;

  for (let index = 0; index < path.points.length - 1; index += 1) {
    const start = path.points[index];
    const end = path.points[index + 1];

    if (!start || !end) {
      break;
    }

    const segmentLength = distanceBetweenGridPoints(start, end);

    if (remaining <= segmentLength || index === path.points.length - 2) {
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;
      const startX = gridToWorldX(start.x);
      const startY = gridToWorldY(start.y);
      const endX = gridToWorldX(end.x);
      const endY = gridToWorldY(end.y);

      return {
        x: Math.round(startX + (endX - startX) * ratio),
        y: Math.round(startY + (endY - startY) * ratio)
      };
    }

    remaining -= segmentLength;
  }

  const fallback = path.points[path.points.length - 1];
  return fallback ? gridToWorld(fallback) : { x: 0, y: 0 };
}

export function buildPadWorldPosition(map: MapDef, padId: string): WorldPoint {
  const pad = map.buildPads.find((candidate) => candidate.id === padId);

  if (!pad) {
    throw new Error(`Missing build pad ${padId}`);
  }

  return gridToWorld(pad);
}

export function battlefieldTowers(snapshot: SimSnapshot): readonly SimSnapshot["towers"][number][] {
  return snapshot.towers;
}

export function battlefieldEnemies(
  snapshot: SimSnapshot
): readonly SimSnapshot["enemies"][number][] {
  return snapshot.enemies.filter((enemy) => enemy.status === "active");
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
