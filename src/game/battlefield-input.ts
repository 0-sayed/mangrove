import type { BuildingDef, Command, LevelConfig, MapMetadata, SimSnapshot } from "@content/schemas";
import { buildSlotWorldPosition, type WorldPoint } from "@game/battlefield-view";

const BUILD_SLOT_HITBOX_HALF_SIZE = 43;

type StartWaveCommand = Extract<Command, { type: "StartWave" }>;
type PlaceBuildingCommand = Extract<Command, { type: "PlaceBuilding" }>;
type SetWorkerCountCommand = Extract<Command, { type: "SetWorkerCount" }>;

const ACTIVE_MESSAGE_STATUSES = new Set<SimSnapshot["messages"][number]["status"]>([
  "accepted",
  "queued",
  "processing"
]);

export function startNextWaveCommand(
  level: LevelConfig,
  snapshot: SimSnapshot
): StartWaveCommand | undefined {
  if (snapshot.phase === "setup") {
    const wave = level.waves[0];

    return wave ? { type: "StartWave", waveId: wave.id } : undefined;
  }

  if (snapshot.phase !== "recap" || !snapshot.activeWaveId) {
    return undefined;
  }

  if (snapshot.messages.some((message) => ACTIVE_MESSAGE_STATUSES.has(message.status))) {
    return undefined;
  }

  const activeWaveIndex = level.waves.findIndex((wave) => wave.id === snapshot.activeWaveId);

  if (activeWaveIndex < 0) {
    return undefined;
  }

  const wave = level.waves[activeWaveIndex + 1];

  if (!wave) {
    return undefined;
  }

  return { type: "StartWave", waveId: wave.id };
}

export function buildSlotCommandForWorldPoint(
  level: LevelConfig,
  map: MapMetadata,
  buildingDefs: readonly BuildingDef[],
  snapshot: SimSnapshot,
  point: WorldPoint
): PlaceBuildingCommand | undefined {
  if (snapshot.phase !== "recap") {
    return undefined;
  }

  const occupiedSlotIds = new Set(snapshot.buildings.map((building) => building.slotId));
  const placedBuildingDefIds = new Set(snapshot.buildings.map((building) => building.defId));
  const hitSlots = map.buildSlots
    .map((slot) => {
      const center = buildSlotWorldPosition(map, slot.id);

      return { slot, center, distance: squaredDistance(center, point) };
    })
    .filter(({ center }) => isInsideBuildSlotHitbox(center, point))
    .sort((left, right) => left.distance - right.distance);

  for (const { slot } of hitSlots) {
    if (occupiedSlotIds.has(slot.id)) {
      continue;
    }

    const buildingDef = buildingDefs.find(
      (candidate) =>
        level.availableBuildings.includes(candidate.id) &&
        candidate.role === slot.role &&
        candidate.allowedSlots.includes(slot.id) &&
        !placedBuildingDefIds.has(candidate.id) &&
        snapshot.meters.budget >= candidate.cost
    );

    if (buildingDef) {
      return { type: "PlaceBuilding", buildingId: buildingDef.id, slotId: slot.id };
    }
  }

  return undefined;
}

export function increaseWorkerCountCommand(
  buildingDefs: readonly BuildingDef[],
  snapshot: SimSnapshot
): SetWorkerCountCommand | undefined {
  if (
    snapshot.phase !== "recap" ||
    !snapshot.workerCount ||
    snapshot.messages.some((message) => ACTIVE_MESSAGE_STATUSES.has(message.status))
  ) {
    return undefined;
  }

  const placedWorkerYard = snapshot.buildings.find((building) =>
    buildingDefs.some((candidate) => candidate.id === building.defId && candidate.role === "worker-yard")
  );
  const workerYard = buildingDefs.find((candidate) => candidate.id === placedWorkerYard?.defId);
  const maxWorkers = workerYard?.stats.maxWorkers;
  const upgradeCost = workerYard?.stats.workerCountUpgradeCost;

  if (
    maxWorkers === undefined ||
    upgradeCost === undefined ||
    snapshot.workerCount >= maxWorkers ||
    snapshot.meters.budget < upgradeCost
  ) {
    return undefined;
  }

  return { type: "SetWorkerCount", count: snapshot.workerCount + 1 };
}

function isInsideBuildSlotHitbox(center: WorldPoint, point: WorldPoint): boolean {
  return (
    Math.abs(point.x - center.x) <= BUILD_SLOT_HITBOX_HALF_SIZE &&
    Math.abs(point.y - center.y) <= BUILD_SLOT_HITBOX_HALF_SIZE
  );
}

function squaredDistance(left: WorldPoint, right: WorldPoint): number {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2;
}
