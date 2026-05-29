import type { Command, LevelConfig, SimSnapshot } from "@content/schemas";
import { createEventLog, type EventLog, pushEvent } from "@sim/event-log";

type SimPhase = SimSnapshot["phase"];
type SnapshotBuilding = SimSnapshot["buildings"][number];
type SnapshotMessage = SimSnapshot["messages"][number];
type LanePressure = SimSnapshot["lanePressure"][number];

interface AppliedCommand {
  readonly tick: number;
  readonly command: Command;
}

export interface GameState {
  readonly configId: string;
  readonly mapId: string;
  readonly seed: number;
  readonly tick: number;
  readonly phase: SimPhase;
  readonly meters: SimSnapshot["meters"];
  readonly workerCount: number;
  readonly buildings: readonly SnapshotBuilding[];
  readonly messages: readonly SnapshotMessage[];
  readonly lanePressure: readonly LanePressure[];
  readonly alerts: readonly string[];
  readonly commandHistory: readonly AppliedCommand[];
  readonly eventLog: EventLog;
}

export function createGame(config: LevelConfig, seed: number): GameState {
  if (!Number.isInteger(seed)) {
    throw new Error("Game seed must be an integer.");
  }

  return {
    configId: config.id,
    mapId: config.mapId,
    seed,
    tick: 0,
    phase: "setup",
    meters: {
      trust: config.startingState.trust,
      budget: config.startingState.budget,
      backlog: config.startingState.backlog
    },
    workerCount: config.startingState.workerCount,
    buildings: config.startingBuildings.map((building, index) => ({
      id: `${building.defId}@${building.slotId}#${String(index)}`,
      defId: building.defId,
      slotId: building.slotId,
      state: "idle"
    })),
    messages: [],
    lanePressure: [],
    alerts: [],
    commandHistory: [],
    eventLog: createEventLog(20)
  };
}

export function step(state: GameState, commandsForTick: readonly Command[]): GameState {
  const commandHistory = [
    ...state.commandHistory,
    ...commandsForTick.map((command) => ({
      tick: state.tick,
      command: { ...command }
    }))
  ];
  const eventLog = commandsForTick.reduce(
    (log, command) =>
      pushEvent(log, {
        tick: state.tick,
        type: "command.received",
        message: command.type
      }),
    state.eventLog
  );

  return {
    ...state,
    tick: state.tick + 1,
    commandHistory,
    eventLog
  };
}

export function toSnapshot(state: GameState): SimSnapshot {
  return {
    tick: state.tick,
    phase: state.phase,
    meters: {
      trust: state.meters.trust,
      budget: state.meters.budget,
      backlog: state.meters.backlog
    },
    buildings: state.buildings.map((building) => ({ ...building })),
    messages: state.messages.map((message) => ({ ...message })),
    lanePressure: state.lanePressure.map((pressure) => ({ ...pressure })),
    alerts: [...state.alerts],
    workerCount: state.workerCount
  };
}
