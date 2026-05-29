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

const NO_COMMANDS: readonly Command[] = [];

function indexCommandsByTick(commandLog: readonly ReplayCommand[]): Map<number, Command[]> {
  const commandsByTick = new Map<number, Command[]>();

  for (const entry of commandLog) {
    const commands = commandsByTick.get(entry.tick);

    if (commands) {
      commands.push(entry.command);
    } else {
      commandsByTick.set(entry.tick, [entry.command]);
    }
  }

  return commandsByTick;
}

export function runReplay(input: ReplayInput): ReplayResult {
  if (!Number.isInteger(input.ticks) || input.ticks < 0) {
    throw new Error("Replay duration must be a non-negative integer.");
  }

  const commandsByTick = indexCommandsByTick(input.commandLog);
  let state = createGame(input.config, input.seed);

  for (let tick = 0; tick < input.ticks; tick += 1) {
    state = step(state, commandsByTick.get(state.tick) ?? NO_COMMANDS);
  }

  return {
    state,
    hash: hashState(state)
  };
}
