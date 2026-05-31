import type { MapMetadata, SimSnapshot } from "@content/schemas";

export interface WorldPoint {
  readonly x: number;
  readonly y: number;
}

export const BATTLEFIELD_VIEW = {
  width: 1280,
  height: 720,
  tileSize: 72,
  originX: 150,
  originY: 10,
  packetYOffset: -34
} as const;

export type BuildingVisualState = "idle" | "accepting" | "filling" | "processing" | "saturated";

interface MapNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

type SnapshotMessage = SimSnapshot["messages"][number];
export type BattlefieldBuilding = Pick<SimSnapshot["buildings"][number], "defId" | "slotId">;

function gridToWorld(point: Pick<MapNode, "x" | "y">): WorldPoint {
  return {
    x: BATTLEFIELD_VIEW.originX + point.x * BATTLEFIELD_VIEW.tileSize,
    y: BATTLEFIELD_VIEW.originY + point.y * BATTLEFIELD_VIEW.tileSize
  };
}

export function pathWorldPoints(map: MapMetadata, pathId: string): WorldPoint[] {
  const path = map.paths.find((candidate) => candidate.id === pathId);

  if (!path) {
    throw new Error(`Missing map path ${pathId}`);
  }

  const points = path.nodeIds.map((nodeId) => gridToWorld(resolvePathNode(map, nodeId)));

  if (points.length < 2) {
    throw new Error(`Path ${pathId} must resolve to at least two visible nodes`);
  }

  return points;
}

export function buildSlotWorldPosition(map: MapMetadata, slotId: string): WorldPoint {
  return gridToWorld(resolveBuildSlot(map, slotId) ?? missingPoint(slotId));
}

export function messageWorldPosition(
  map: MapMetadata,
  message: SnapshotMessage,
  placedBuildings?: readonly BattlefieldBuilding[]
): WorldPoint {
  const path = map.paths.find((candidate) => candidate.id === message.pathId);

  if (!path) {
    throw new Error(`Missing map path ${message.pathId}`);
  }

  const point = gridToWorld(resolveMessageAnchor(map, path, message.status, placedBuildings));

  return {
    x: point.x,
    y: point.y + BATTLEFIELD_VIEW.packetYOffset
  };
}

export function queueFillCount(snapshot: SimSnapshot): number {
  return snapshot.messages.filter((message) => message.status === "queued").length;
}

export function battlefieldBuildings(
  snapshot: SimSnapshot
): readonly SimSnapshot["buildings"][number][] {
  return snapshot.buildings;
}

export function activePacketMessages(snapshot: SimSnapshot): readonly SnapshotMessage[] {
  return snapshot.messages.filter((message) => message.status !== "delivered");
}

export function buildingVisualState(
  snapshot: SimSnapshot,
  building: BattlefieldBuilding
): BuildingVisualState {
  const snapshotBuilding = snapshot.buildings.find(
    (candidate) => candidate.defId === building.defId && candidate.slotId === building.slotId
  );

  if (snapshotBuilding?.state === "saturated") {
    return "saturated";
  }

  if (snapshotBuilding?.state === "processing") {
    return "processing";
  }

  if (building.defId === "api-gate" && snapshot.messages.some(isAcceptedOrBeyondApiGate)) {
    return "accepting";
  }

  if (building.defId === "queue-hub" && queueFillCount(snapshot) > 0) {
    return "filling";
  }

  if (
    building.defId === "worker-yard" &&
    snapshot.messages.some((message) => message.status === "processing")
  ) {
    return "processing";
  }

  return "idle";
}

function resolveMessageAnchor(
  map: MapMetadata,
  path: MapMetadata["paths"][number],
  status: SnapshotMessage["status"],
  placedBuildings: readonly BattlefieldBuilding[] | undefined
): MapNode {
  if (status === "spawned") {
    return resolveSpawn(map, path.spawnId) ?? missingPoint(path.spawnId);
  }

  if (status === "accepted") {
    return resolvePathSlotByRole(map, path, "api-gate") ?? missingPoint("api-gate");
  }

  if (status === "queued") {
    return (
      resolvePathSlotByRole(map, path, "queue-hub") ??
      resolvePathSlotByRole(map, path, "api-gate") ??
      missingPoint("queue-hub or api-gate")
    );
  }

  if (status === "dropped" || status === "expired") {
    return (
      resolveFailureSlot(map, path, placedBuildings) ??
      resolvePathSlotByRole(map, path, "api-gate") ??
      missingPoint("placed queue-hub or api-gate")
    );
  }

  if (status === "processing") {
    return resolvePathSlotByRole(map, path, "worker-yard") ?? missingPoint("worker-yard");
  }

  return resolveExit(map, path.exitId) ?? missingPoint(path.exitId);
}

function resolvePathSlotByRole(
  map: MapMetadata,
  path: MapMetadata["paths"][number],
  role: MapMetadata["buildSlots"][number]["role"]
): MapNode | undefined {
  return map.buildSlots.find(
    (candidate) => candidate.role === role && path.nodeIds.includes(candidate.id)
  );
}

function resolveFailureSlot(
  map: MapMetadata,
  path: MapMetadata["paths"][number],
  placedBuildings: readonly BattlefieldBuilding[] | undefined
): MapNode | undefined {
  if (placedBuildings === undefined) {
    return resolvePathSlotByRole(map, path, "queue-hub");
  }

  return map.buildSlots.find(
    (slot) =>
      slot.role === "queue-hub" &&
      path.nodeIds.includes(slot.id) &&
      placedBuildings.some((building) => building.slotId === slot.id)
  );
}

function resolvePathNode(map: MapMetadata, nodeId: string): MapNode {
  return (
    resolveSpawn(map, nodeId) ??
    resolveBuildSlot(map, nodeId) ??
    resolveExit(map, nodeId) ??
    missingPoint(nodeId)
  );
}

function resolveSpawn(map: MapMetadata, spawnId: string): MapNode | undefined {
  return map.spawns.find((spawn) => spawn.id === spawnId);
}

function resolveBuildSlot(map: MapMetadata, slotId: string): MapNode | undefined {
  return map.buildSlots.find((slot) => slot.id === slotId);
}

function resolveExit(map: MapMetadata, exitId: string): MapNode | undefined {
  return map.exits.find((exit) => exit.id === exitId);
}

function missingPoint(pointId: string): never {
  throw new Error(`Missing map point ${pointId}`);
}

function isAcceptedOrBeyondApiGate(message: SnapshotMessage): boolean {
  return (
    message.status === "accepted" || message.status === "queued" || message.status === "processing"
  );
}
