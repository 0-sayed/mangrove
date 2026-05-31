import {
  tdContractFixtureEnemyDefs,
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs,
  workerTowerDef
} from "@content/td-contract-fixture";
import type { Command, SimSnapshot } from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

export const RUN_TICK_INTERVAL_MS = 100;

const DEFAULT_RUN_SEED = 12345;
const WORKER_TOWER_ID = workerTowerDef.id;
const WORKER_TOWER_PAD_ID = "pad-worker-a";

const PHASE_LABELS: Readonly<Record<GameState["phase"], string>> = {
  setup: "Build",
  wave: "Wave",
  recap: "Recap",
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
  readonly canBuildWorkerTower: boolean;
  readonly workerTowerCost: number;
  readonly isAutoAdvancing: boolean;
}

export function createInitialRun(seed = DEFAULT_RUN_SEED): GameRun {
  return {
    game: createGame(tdContractFixtureLevel, seed, {
      towerDefs: tdContractFixtureTowerDefs,
      enemyDefs: tdContractFixtureEnemyDefs,
      map: tdContractFixtureMap
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
  const nextWave = game.config.waves.find((wave) => !game.completedWaveIds.includes(wave.id));
  const workerTower = game.towerDefsById[WORKER_TOWER_ID];
  const workerTowerCost = workerTower?.cost ?? 0;
  const workerPadAvailable = !game.towers.some((tower) => tower.padId === WORKER_TOWER_PAD_ID);

  return {
    phaseLabel: PHASE_LABELS[game.phase],
    activeWaveLabel: game.activeWaveId ? labelWave(game, game.activeWaveId) : "Awaiting wave",
    ...(nextWave ? { nextWaveId: nextWave.id } : {}),
    nextWaveLabel: nextWave ? labelWave(game, nextWave.id) : "Complete",
    canStartNextWave: nextWave !== undefined && (game.phase === "setup" || game.phase === "recap"),
    canBuildWorkerTower:
      game.phase === "setup" &&
      workerTower !== undefined &&
      workerPadAvailable &&
      game.meters.buildBudget >= workerTowerCost,
    workerTowerCost,
    isAutoAdvancing: game.phase === "wave"
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

export function createBuildWorkerTowerCommand(): Command {
  return {
    type: "BuildTower",
    towerId: WORKER_TOWER_ID,
    padId: WORKER_TOWER_PAD_ID
  };
}

function labelWave(game: GameState, waveId: string): string {
  return game.config.waves.find((wave) => wave.id === waveId)?.displayName ?? waveId;
}
