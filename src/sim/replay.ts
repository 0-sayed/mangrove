import type { Command, LevelConfig } from "@content/schemas";
import { createGame, step, type GameState } from "@sim/game";
import { hashState } from "@sim/hash";

export interface ReplayCommand {
  readonly tick: number;
  readonly command: Command;
}

export interface ReplayInput {
  readonly config: LevelConfig;
  readonly seed: number;
  readonly ticks: number;
  readonly commandLog: readonly ReplayCommand[];
}

export interface ReplayResult {
  readonly state: GameState;
  readonly hash: string;
}

function commandsForTick(commandLog: readonly ReplayCommand[], tick: number): readonly Command[] {
  return commandLog.filter((entry) => entry.tick === tick).map((entry) => entry.command);
}

export function runReplay(input: ReplayInput): ReplayResult {
  if (!Number.isInteger(input.ticks) || input.ticks < 0) {
    throw new Error("Replay duration must be a non-negative integer.");
  }

  let state = createGame(input.config, input.seed);

  for (let tick = 0; tick < input.ticks; tick += 1) {
    state = step(state, commandsForTick(input.commandLog, state.tick));
  }

  return {
    state,
    hash: hashState(state)
  };
}
