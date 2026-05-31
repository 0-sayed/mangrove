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

function distanceBetween(start: WorldPoint, end: WorldPoint): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
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
  const points = pathWorldPoints(map, pathId);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const segmentLengths = points
    .slice(0, -1)
    .map((point, index) => distanceBetween(point, points[index + 1] ?? point));
  const totalLength = segmentLengths.reduce((total, length) => total + length, 0);
  let remaining = clampedProgress * totalLength;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index] ?? 0;
    const start = points[index];
    const end = points[index + 1];

    if (!start || !end) {
      break;
    }

    if (remaining <= segmentLength || index === segmentLengths.length - 1) {
      const ratio = segmentLength === 0 ? 0 : remaining / segmentLength;

      return {
        x: Math.round(start.x + (end.x - start.x) * ratio),
        y: Math.round(start.y + (end.y - start.y) * ratio)
      };
    }

    remaining -= segmentLength;
  }

  return points[points.length - 1] ?? { x: 0, y: 0 };
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
