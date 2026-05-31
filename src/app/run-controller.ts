import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { Command, SimSnapshot } from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

export const RUN_TICK_INTERVAL_MS = 100;

const DEFAULT_RUN_SEED = 12345;
const QUEUE_HUB_BUILDING_ID = "queue-hub";
const QUEUE_HUB_SLOT_ID = "slot_queue_1";
const OPENING_WAVE_ID = "wave-opening-flow";
const ACTIVE_MESSAGE_STATUSES = new Set<SimSnapshot["messages"][number]["status"]>([
  "accepted",
  "queued",
  "processing"
]);

const WAVE_LABELS: Readonly<Record<string, string>> = {
  "wave-opening-flow": "Opening Flow",
  "wave-flood": "Flood Wave"
};

const PHASE_LABELS: Readonly<Record<GameState["phase"], string>> = {
  setup: "Prepare",
  wave: "Wave",
  recap: "Build Phase",
  complete: "Complete"
};

export interface GameRun {
  readonly game: GameState;
  readonly pendingCommands: readonly Command[];
}

export interface RunControls {
  readonly phaseLabel: string;
  readonly activeWaveLabel: string;
  readonly nextWaveId?: string;
  readonly nextWaveLabel: string;
  readonly canStartNextWave: boolean;
  readonly canPlaceQueueHub: boolean;
  readonly queueHubCost: number;
  readonly canIncreaseWorkerCount: boolean;
  readonly workerCount: number;
  readonly maxWorkerCount: number;
  readonly workerCountUpgradeCost: number;
  readonly isAutoAdvancing: boolean;
}

export function createInitialRun(seed = DEFAULT_RUN_SEED): GameRun {
  return {
    game: createGame(messageFestivalV0Level, seed, {
      buildingDefs: messageFestivalV0BuildingDefs,
      map: messageFestivalV0Map
    }),
    pendingCommands: []
  };
}

export function queueRunCommand(run: GameRun, command: Command): GameRun {
  return {
    game: run.game,
    pendingCommands: [...run.pendingCommands, { ...command }]
  };
}

export function advanceRun(run: GameRun, ticks = 1): GameRun {
  if (!Number.isInteger(ticks) || ticks < 1) {
    throw new Error("Run ticks must be a positive integer.");
  }

  let game = run.game;
  for (let tickIndex = 0; tickIndex < ticks; tickIndex += 1) {
    game = step(game, tickIndex === 0 ? run.pendingCommands : []);
  }

  return {
    game,
    pendingCommands: []
  };
}

export function applyRunCommand(run: GameRun, command: Command): GameRun {
  return advanceRun(queueRunCommand(run, command), 1);
}

export function toRunSnapshot(run: GameRun): SimSnapshot {
  return toSnapshot(run.game);
}

export function getRunControls(game: GameState): RunControls {
  const nextWave = game.config.waves.find(
    (wave) => wave.id !== game.activeWaveId && !game.completedWaveIds.includes(wave.id)
  );
  const hasActiveMessages = game.messages.some((message) =>
    ACTIVE_MESSAGE_STATUSES.has(message.status)
  );
  const isDrainedRecap = game.phase === "recap" && !hasActiveMessages;
  const openingCompleted = game.completedWaveIds.includes(OPENING_WAVE_ID);
  const queueHubDef = game.buildingDefsById[QUEUE_HUB_BUILDING_ID];
  const queueHubCost = queueHubDef?.cost ?? 0;
  const hasQueueHub = game.buildings.some((building) => building.defId === QUEUE_HUB_BUILDING_ID);
  const workerYard = game.buildings.find(
    (building) => game.buildingDefsById[building.defId]?.role === "worker-yard"
  );
  const workerYardStats = workerYard ? game.buildingDefsById[workerYard.defId]?.stats : undefined;
  const maxWorkerCount = workerYardStats?.maxWorkers ?? game.workerCount;
  const workerCountUpgradeCost = workerYardStats?.workerCountUpgradeCost ?? 0;
  const canActBetweenWaves = openingCompleted && isDrainedRecap;

  return {
    phaseLabel: labelPhase(game.phase),
    activeWaveLabel: game.activeWaveId ? labelWave(game.activeWaveId) : "No wave",
    ...(nextWave
      ? {
          nextWaveId: nextWave.id
        }
      : {}),
    nextWaveLabel: nextWave ? labelWave(nextWave.id) : "No wave",
    canStartNextWave:
      nextWave !== undefined && ((game.phase === "setup" && !hasActiveMessages) || isDrainedRecap),
    canPlaceQueueHub: canActBetweenWaves && !hasQueueHub && game.meters.budget >= queueHubCost,
    queueHubCost,
    canIncreaseWorkerCount:
      canActBetweenWaves &&
      game.workerCount < maxWorkerCount &&
      game.meters.budget >= workerCountUpgradeCost,
    workerCount: game.workerCount,
    maxWorkerCount,
    workerCountUpgradeCost,
    isAutoAdvancing: game.phase === "wave" || (game.phase === "recap" && hasActiveMessages)
  };
}

export function createStartNextWaveCommand(controls: RunControls): Command {
  if (!controls.nextWaveId) {
    throw new Error("No next wave is available.");
  }

  return {
    type: "StartWave",
    waveId: controls.nextWaveId
  };
}

export function createPlaceQueueHubCommand(): Command {
  return {
    type: "PlaceBuilding",
    buildingId: QUEUE_HUB_BUILDING_ID,
    slotId: QUEUE_HUB_SLOT_ID
  };
}

export function createIncreaseWorkerCountCommand(currentCount: number): Command {
  return {
    type: "SetWorkerCount",
    count: currentCount + 1
  };
}

function labelWave(waveId: string): string {
  return WAVE_LABELS[waveId] ?? waveId;
}

function labelPhase(phase: GameState["phase"]): string {
  return PHASE_LABELS[phase];
}
