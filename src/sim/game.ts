import type {
  BuildingDef,
  Command,
  LevelConfig,
  MapMetadata,
  SimSnapshot,
  WaveDef
} from "@content/schemas";
import { createEventLog, type EventLog, pushEvent } from "@sim/event-log";

type SimPhase = SimSnapshot["phase"];
type SnapshotBuilding = SimSnapshot["buildings"][number];
type SnapshotMessage = SimSnapshot["messages"][number];
type LanePressure = SimSnapshot["lanePressure"][number];

export interface GameOptions {
  readonly buildingDefs?: readonly BuildingDef[];
  readonly map?: MapMetadata;
}

type BuildingDefById = Readonly<Record<string, BuildingDef>>;

interface LifecycleMessage extends SnapshotMessage {
  readonly acceptedTick?: number;
  readonly processingRemainingTicks?: number;
}

function withoutProcessingProgress(message: LifecycleMessage): LifecycleMessage {
  return {
    id: message.id,
    type: message.type,
    status: message.status,
    pathId: message.pathId,
    ageTicks: message.ageTicks,
    ...(message.acceptedTick === undefined ? {} : { acceptedTick: message.acceptedTick })
  };
}

interface AppliedCommand {
  readonly tick: number;
  readonly command: Command;
}

export interface GameState {
  readonly config: LevelConfig;
  readonly configId: string;
  readonly mapId: string;
  readonly seed: number;
  readonly tick: number;
  readonly phase: SimPhase;
  readonly activeWaveId?: string;
  readonly activeWaveStartedTick?: number;
  readonly buildingDefsById: BuildingDefById;
  readonly map?: MapMetadata;
  readonly meters: SimSnapshot["meters"];
  readonly workerCount: number;
  readonly buildings: readonly SnapshotBuilding[];
  readonly messages: readonly LifecycleMessage[];
  readonly lanePressure: readonly LanePressure[];
  readonly alerts: readonly string[];
  readonly commandHistory: readonly AppliedCommand[];
  readonly eventLog: EventLog;
}

function indexBuildingDefs(buildingDefs: readonly BuildingDef[] | undefined): BuildingDefById {
  return Object.fromEntries((buildingDefs ?? []).map((def) => [def.id, def]));
}

function cloneWave(wave: WaveDef): WaveDef {
  return {
    ...wave,
    spawnSchedule: wave.spawnSchedule.map((item) => ({ ...item })),
    messageTypes: [...wave.messageTypes]
  };
}

function cloneLevelConfig(config: LevelConfig): LevelConfig {
  return {
    ...config,
    startingState: { ...config.startingState },
    startingBuildings: config.startingBuildings.map((building) => ({ ...building })),
    availableBuildings: [...config.availableBuildings],
    ...(config.unlocks
      ? {
          unlocks: config.unlocks.map((unlock) => ({
            ...unlock,
            ...(unlock.buildingIds ? { buildingIds: [...unlock.buildingIds] } : {}),
            ...(unlock.commandTypes ? { commandTypes: [...unlock.commandTypes] } : {})
          }))
        }
      : {}),
    waves: config.waves.map(cloneWave),
    winCondition: { ...config.winCondition },
    lossCondition: { ...config.lossCondition },
    recaps: config.recaps.map((recap) => ({
      ...recap,
      lines: [...recap.lines]
    }))
  };
}

function cloneMapMetadata(map: MapMetadata): MapMetadata {
  return {
    ...map,
    paths: map.paths.map((path) => ({
      ...path,
      nodeIds: [...path.nodeIds]
    })),
    buildSlots: map.buildSlots.map((slot) => ({ ...slot })),
    spawns: map.spawns.map((spawn) => ({ ...spawn })),
    exits: map.exits.map((exit) => ({ ...exit }))
  };
}

function cloneBuildingDefs(buildingDefs: readonly BuildingDef[] | undefined): readonly BuildingDef[] {
  return (buildingDefs ?? []).map((def) => ({
    ...def,
    allowedSlots: [...def.allowedSlots],
    stats: { ...def.stats },
    visibleStates: [...def.visibleStates]
  }));
}

export function createGame(config: LevelConfig, seed: number, options: GameOptions = {}): GameState {
  if (!Number.isInteger(seed)) {
    throw new Error("Game seed must be an integer.");
  }

  const configSnapshot = cloneLevelConfig(config);
  const mapSnapshot = options.map ? cloneMapMetadata(options.map) : undefined;

  return {
    config: configSnapshot,
    configId: configSnapshot.id,
    mapId: configSnapshot.mapId,
    seed,
    tick: 0,
    phase: "setup",
    buildingDefsById: indexBuildingDefs(cloneBuildingDefs(options.buildingDefs)),
    ...(mapSnapshot ? { map: mapSnapshot } : {}),
    meters: {
      trust: configSnapshot.startingState.trust,
      budget: configSnapshot.startingState.budget,
      backlog: configSnapshot.startingState.backlog
    },
    workerCount: configSnapshot.startingState.workerCount,
    buildings: configSnapshot.startingBuildings.map((building, index) => ({
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

function findBuildingByRole(
  state: GameState,
  role: BuildingDef["role"]
): SnapshotBuilding | undefined {
  return state.buildings.find((building) => state.buildingDefsById[building.defId]?.role === role);
}

function getBuildingStat(
  state: GameState,
  building: SnapshotBuilding | undefined,
  stat: string
): number {
  if (!building) {
    throw new Error("Building definitions are required before running the message lifecycle.");
  }

  const def = state.buildingDefsById[building.defId];
  const value = def?.stats[stat];

  if (value === undefined) {
    throw new Error("Building definitions are required before running the message lifecycle.");
  }

  return value;
}

function mainPathId(state: GameState): string {
  const path = state.map?.paths[0];

  if (!path) {
    throw new Error("Map metadata is required before running the message lifecycle.");
  }

  return path.id;
}

function applyCommand(state: GameState, command: Command): GameState {
  if (command.type !== "StartWave") {
    return state;
  }

  const wave = state.config.waves.find((candidate) => candidate.id === command.waveId);

  if (
    !wave ||
    (state.phase !== "setup" && state.phase !== "recap") ||
    (state.phase === "recap" && state.messages.some(isActiveMessage))
  ) {
    return state;
  }

  return {
    ...state,
    phase: "wave",
    activeWaveId: wave.id,
    activeWaveStartedTick: state.tick,
    eventLog: pushEvent(state.eventLog, {
      tick: state.tick,
      type: "wave.started",
      waveId: wave.id
    })
  };
}

function activeWave(state: GameState): WaveDef | undefined {
  return state.config.waves.find((wave) => wave.id === state.activeWaveId);
}

function waveElapsedTick(state: GameState): number | undefined {
  return state.activeWaveStartedTick === undefined
    ? undefined
    : state.tick - state.activeWaveStartedTick;
}

function isActiveMessage(message: LifecycleMessage): boolean {
  return (
    message.status === "accepted" || message.status === "queued" || message.status === "processing"
  );
}

function changeMeter(
  state: GameState,
  meter: keyof GameState["meters"],
  delta: number
): GameState {
  const previousValue = state.meters[meter];
  const nextValue = Math.max(0, previousValue + delta);
  const actualDelta = nextValue - previousValue;

  if (actualDelta === 0) {
    return state;
  }

  return {
    ...state,
    meters: { ...state.meters, [meter]: nextValue },
    eventLog: pushEvent(state.eventLog, {
      tick: state.tick,
      type: "meter.changed",
      meter,
      delta: actualDelta,
      value: nextValue
    })
  };
}

function nextMessageId(state: GameState, waveId: string, offset: number): string {
  return `${waveId}-message-${String(state.messages.length + offset + 1)}`;
}

function spawnMessages(state: GameState): GameState {
  const wave = activeWave(state);
  const elapsed = waveElapsedTick(state);

  if (!wave || elapsed === undefined) {
    return state;
  }

  const scheduled = wave.spawnSchedule.filter((item) => item.tick === elapsed);
  if (scheduled.length === 0) {
    return state;
  }

  let messageOffset = 0;
  let eventLog = state.eventLog;
  const spawned: LifecycleMessage[] = [];

  for (const item of scheduled) {
    for (let index = 0; index < item.count; index += 1) {
      const id = nextMessageId(state, wave.id, messageOffset);
      messageOffset += 1;
      spawned.push({
        id,
        type: item.messageType,
        status: "spawned",
        pathId: mainPathId(state),
        ageTicks: 0
      });
      eventLog = pushEvent(eventLog, {
        tick: state.tick,
        type: "message.spawned",
        messageId: id,
        messageType: item.messageType
      });
    }
  }

  return {
    ...state,
    messages: [...state.messages, ...spawned],
    eventLog
  };
}

function acceptAndRouteMessages(state: GameState): GameState {
  const queue = findBuildingByRole(state, "queue-hub");
  let eventLog = state.eventLog;
  const messages = state.messages.map((message): LifecycleMessage => {
    if (message.status !== "spawned") {
      return message;
    }

    const accepted = {
      ...message,
      status: queue ? "queued" : "accepted",
      acceptedTick: state.tick
    } satisfies LifecycleMessage;

    eventLog = pushEvent(eventLog, {
      tick: state.tick,
      type: "message.accepted",
      messageId: message.id
    });

    if (queue) {
      eventLog = pushEvent(eventLog, {
        tick: state.tick,
        type: "message.queued",
        messageId: message.id,
        queueId: queue.id
      });
    }

    return accepted;
  });

  return { ...state, messages, eventLog };
}

function dropMessagesOverCapacity(
  state: GameState,
  status: LifecycleMessage["status"],
  capacity: number,
  reason: "direct-handoff-overflow" | "queue-overflow"
): GameState {
  const eligibleIndexes = state.messages.flatMap((message, index) =>
    message.status === status ? [index] : []
  );
  const overflowCount = eligibleIndexes.length - capacity;

  if (overflowCount <= 0) {
    return state;
  }

  const dropIndexes = eligibleIndexes.slice(-overflowCount).reverse();
  const dropIndexSet = new Set(dropIndexes);
  let nextState = state;

  for (const index of dropIndexes) {
    const message = state.messages[index];

    if (!message) {
      continue;
    }

    nextState = {
      ...nextState,
      eventLog: pushEvent(nextState.eventLog, {
        tick: state.tick,
        type: "message.dropped",
        messageId: message.id,
        reason
      })
    };
    nextState = changeMeter(nextState, "trust", -3);
  }

  return {
    ...nextState,
    messages: state.messages.map((message, index): LifecycleMessage =>
      dropIndexSet.has(index) ? { ...message, status: "dropped" } : message
    )
  };
}

function enforceCapacity(state: GameState): GameState {
  const queue = findBuildingByRole(state, "queue-hub");

  if (queue) {
    return dropMessagesOverCapacity(
      state,
      "queued",
      getBuildingStat(state, queue, "capacity"),
      "queue-overflow"
    );
  }

  const apiGate = findBuildingByRole(state, "api-gate");

  return dropMessagesOverCapacity(
    state,
    "accepted",
    getBuildingStat(state, apiGate, "directHandoffCapacity"),
    "direct-handoff-overflow"
  );
}

function ageAcceptedMessages(state: GameState): GameState {
  return {
    ...state,
    messages: state.messages.map((message): LifecycleMessage => {
      if (!isActiveMessage(message) || message.acceptedTick === undefined) {
        return message;
      }

      return {
        ...message,
        ageTicks: state.tick - message.acceptedTick
      };
    })
  };
}

function expirePatientMessages(state: GameState): GameState {
  const apiGate = findBuildingByRole(state, "api-gate");
  const patienceTicks = getBuildingStat(state, apiGate, "messagePatienceTicks");
  let nextState = state;

  const messages = state.messages.map((message): LifecycleMessage => {
    if (!isActiveMessage(message) || message.ageTicks < patienceTicks) {
      return message;
    }

    nextState = changeMeter(nextState, "trust", -2);

    return {
      ...withoutProcessingProgress(message),
      status: "expired"
    };
  });

  return { ...nextState, messages };
}

function progressWorkers(state: GameState): GameState {
  const workerYard = findBuildingByRole(state, "worker-yard");
  if (!workerYard) {
    throw new Error("Building definitions are required before running the message lifecycle.");
  }

  let nextState = state;
  const messages = state.messages.map((message): LifecycleMessage => {
    if (message.status !== "processing") {
      return message;
    }

    const remainingTicks = Math.max(0, (message.processingRemainingTicks ?? 0) - 1);

    if (remainingTicks > 0) {
      return {
        ...message,
        processingRemainingTicks: remainingTicks
      };
    }

    nextState = changeMeter(nextState, "budget", 1);
    nextState = {
      ...nextState,
      eventLog: pushEvent(nextState.eventLog, {
        tick: state.tick,
        type: "worker.acked",
        messageId: message.id,
        workerYardId: workerYard.id
      })
    };

    return {
      ...withoutProcessingProgress(message),
      status: "delivered"
    };
  });

  return { ...nextState, messages };
}

function startWorkers(state: GameState): GameState {
  const workerYard = findBuildingByRole(state, "worker-yard");
  if (!workerYard) {
    throw new Error("Building definitions are required before running the message lifecycle.");
  }

  const processingTicks = getBuildingStat(state, workerYard, "processingTicks");
  const currentlyProcessing = state.messages.filter(
    (message) => message.status === "processing"
  ).length;
  let availableWorkers = Math.max(0, state.workerCount - currentlyProcessing);

  if (availableWorkers === 0) {
    return state;
  }

  let eventLog = state.eventLog;
  const messages = state.messages.map((message): LifecycleMessage => {
    if (availableWorkers === 0 || (message.status !== "queued" && message.status !== "accepted")) {
      return message;
    }

    availableWorkers -= 1;
    eventLog = pushEvent(eventLog, {
      tick: state.tick,
      type: "worker.started",
      messageId: message.id,
      workerYardId: workerYard.id
    });

    return {
      ...message,
      status: "processing",
      processingRemainingTicks: processingTicks
    };
  });

  return { ...state, messages, eventLog };
}

function recalculateBacklog(state: GameState): GameState {
  const backlog = state.messages.filter(isActiveMessage).length;
  const delta = backlog - state.meters.backlog;
  const pressureByPath = new Map<string, { backlog: number; dropped: number }>();

  for (const message of state.messages) {
    if (!isActiveMessage(message) && message.status !== "dropped") {
      continue;
    }

    const current = pressureByPath.get(message.pathId) ?? { backlog: 0, dropped: 0 };
    pressureByPath.set(message.pathId, {
      backlog: current.backlog + (isActiveMessage(message) ? 1 : 0),
      dropped: current.dropped + (message.status === "dropped" ? 1 : 0)
    });
  }
  const lanePressure = Array.from(pressureByPath, ([pathId, pressure]) => ({
    pathId,
    ...pressure
  }));

  return { ...changeMeter(state, "backlog", delta), lanePressure };
}

function hasFutureSpawns(wave: WaveDef, elapsed: number): boolean {
  return wave.spawnSchedule.some((item) => item.tick > elapsed);
}

function maybeEndWave(state: GameState): GameState {
  if (state.phase !== "wave") {
    return state;
  }

  const wave = activeWave(state);
  const elapsed = waveElapsedTick(state);

  if (!wave || elapsed === undefined) {
    return state;
  }

  const timedOut = elapsed >= wave.timeoutTicks;
  const spawnWindowResolved = elapsed >= wave.durationTicks && !hasFutureSpawns(wave, elapsed);
  const activeBacklogResolved = !state.messages.some(isActiveMessage);

  if (!timedOut && (!spawnWindowResolved || !activeBacklogResolved)) {
    return state;
  }

  return {
    ...state,
    phase: "recap",
    eventLog: pushEvent(state.eventLog, {
      tick: state.tick,
      type: "wave.ended",
      waveId: wave.id
    })
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
  const commandState = commandsForTick.reduce(applyCommand, {
    ...state,
    commandHistory,
    eventLog
  });
  let lifecycleState = commandState;

  if (lifecycleState.phase === "wave") {
    lifecycleState = spawnMessages(lifecycleState);
    lifecycleState = acceptAndRouteMessages(lifecycleState);
    lifecycleState = enforceCapacity(lifecycleState);
    lifecycleState = ageAcceptedMessages(lifecycleState);
    lifecycleState = expirePatientMessages(lifecycleState);
    lifecycleState = progressWorkers(lifecycleState);
    lifecycleState = startWorkers(lifecycleState);
    lifecycleState = recalculateBacklog(lifecycleState);
    lifecycleState = maybeEndWave(lifecycleState);
  } else if (lifecycleState.phase === "recap" && lifecycleState.messages.some(isActiveMessage)) {
    lifecycleState = ageAcceptedMessages(lifecycleState);
    lifecycleState = expirePatientMessages(lifecycleState);
    lifecycleState = progressWorkers(lifecycleState);
    lifecycleState = startWorkers(lifecycleState);
    lifecycleState = recalculateBacklog(lifecycleState);
  }

  return {
    ...lifecycleState,
    tick: lifecycleState.tick + 1
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
    messages: state.messages.map(({ id, type, status, pathId, ageTicks }) => ({
      id,
      type,
      status,
      pathId,
      ageTicks
    })),
    lanePressure: state.lanePressure.map((pressure) => ({ ...pressure })),
    alerts: [...state.alerts],
    workerCount: state.workerCount,
    ...(state.activeWaveId ? { activeWaveId: state.activeWaveId } : {})
  };
}
