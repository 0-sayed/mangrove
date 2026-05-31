import type { MapDef, PathDef } from "@content/schemas";

export interface Point {
  x: number;
  y: number;
}

function clampProgress(progress: number): number {
  return Math.min(1, Math.max(0, progress));
}

function distanceBetween(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function distanceFromPointToSegment(point: Point, start: Point, end: Point): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (segmentLengthSquared === 0) {
    return distanceBetween(point, start);
  }

  const progress = ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / segmentLengthSquared;
  const clampedProgress = clampProgress(progress);
  const closestPoint = {
    x: start.x + deltaX * clampedProgress,
    y: start.y + deltaY * clampedProgress
  };

  return distanceBetween(point, closestPoint);
}

export function pointAtPathProgress(path: PathDef, progress: number): Point {
  const targetDistance = path.length * clampProgress(progress);
  let traveledDistance = 0;

  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];

    if (!start || !end) {
      continue;
    }

    const segmentLength = distanceBetween(start, end);

    if (segmentLength === 0) {
      continue;
    }

    if (traveledDistance + segmentLength >= targetDistance) {
      const segmentProgress = (targetDistance - traveledDistance) / segmentLength;

      return {
        x: start.x + (end.x - start.x) * segmentProgress,
        y: start.y + (end.y - start.y) * segmentProgress
      };
    }

    traveledDistance += segmentLength;
  }

  const finalPoint = path.points[path.points.length - 1];

  if (!finalPoint) {
    throw new Error("Expected path to include at least one point.");
  }

  return { x: finalPoint.x, y: finalPoint.y };
}

export function distanceFromPointToPath(point: Point, path: PathDef): number {
  let shortestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < path.points.length; index += 1) {
    const start = path.points[index - 1];
    const end = path.points[index];

    if (!start || !end) {
      continue;
    }

    shortestDistance = Math.min(shortestDistance, distanceFromPointToSegment(point, start, end));
  }

  return shortestDistance;
}

export function pathIdsCoveredByPad(map: MapDef, pad: Point, radius: number): string[] {
  return map.paths
    .filter((path) => distanceFromPointToPath(pad, path) <= radius)
    .map((path) => path.id);
}

export function sharedPortalCorePathIds(map: MapDef, pathId: string): string[] {
  const referencePath = map.paths.find((path) => path.id === pathId);

  if (!referencePath) {
    return [];
  }

  return map.paths
    .filter((path) => path.portalId === referencePath.portalId && path.coreId === referencePath.coreId)
    .map((path) => path.id);
}
