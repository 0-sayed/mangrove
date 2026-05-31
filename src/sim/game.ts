import type {
  Command,
  EnemyDef,
  LevelConfig,
  MapDef,
  SimSnapshot,
  TowerDef,
  WaveDef
} from "@content/schemas";
import { createEventLog, type EventLog, pushEvent } from "@sim/event-log";

type SimPhase = SimSnapshot["phase"];
type SnapshotTower = SimSnapshot["towers"][number];
type SnapshotEnemy = SimSnapshot["enemies"][number];
type SnapshotProjectile = SimSnapshot["projectiles"][number];

export interface GameOptions {
  readonly towerDefs?: readonly TowerDef[];
  readonly enemyDefs?: readonly EnemyDef[];
  readonly map?: MapDef;
}

type TowerDefById = Readonly<Record<string, TowerDef>>;
type EnemyDefById = Readonly<Record<string, EnemyDef>>;

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
  readonly towerDefsById: TowerDefById;
  readonly enemyDefsById: EnemyDefById;
  readonly map?: MapDef;
  readonly meters: SimSnapshot["meters"];
  readonly towers: readonly SnapshotTower[];
  readonly enemies: readonly SnapshotEnemy[];
  readonly projectiles: readonly SnapshotProjectile[];
  readonly alerts: readonly string[];
  readonly buildIntent: SimSnapshot["buildIntent"];
  readonly selection: SimSnapshot["selection"];
  readonly hover: SimSnapshot["hover"];
  readonly completedWaveIds: readonly string[];
  readonly commandHistory: readonly AppliedCommand[];
  readonly eventLog: EventLog;
}

function indexTowerDefs(towerDefs: readonly TowerDef[] | undefined): TowerDefById {
  return Object.fromEntries((towerDefs ?? []).map((def) => [def.id, def]));
}

function indexEnemyDefs(enemyDefs: readonly EnemyDef[] | undefined): EnemyDefById {
  return Object.fromEntries((enemyDefs ?? []).map((def) => [def.id, def]));
}

function cloneLevelConfig(config: LevelConfig): LevelConfig {
  return {
    ...config,
    startingState: { ...config.startingState },
    availableTowerIds: [...config.availableTowerIds],
    waves: config.waves.map((wave) => ({
      ...wave,
      preview: { ...wave.preview, enemyKinds: [...wave.preview.enemyKinds] },
      spawns: wave.spawns.map((spawn) => ({ ...spawn }))
    })),
    recapLaws: config.recapLaws.map((law) => ({ ...law }))
  };
}

function cloneMapDef(map: MapDef): MapDef {
  return {
    ...map,
    size: { ...map.size },
    paths: map.paths.map((path) => ({
      ...path,
      points: path.points.map((point) => ({ ...point }))
    })),
    buildPads: map.buildPads.map((pad) => ({
      ...pad,
      allowedTowerKinds: [...pad.allowedTowerKinds]
    })),
    portals: map.portals.map((portal) => ({ ...portal })),
    cores: map.cores.map((core) => ({ ...core }))
  };
}

function cloneTowerDefs(towerDefs: readonly TowerDef[] | undefined): readonly TowerDef[] {
  return (towerDefs ?? []).map((def) => ({
    ...def,
    targets: [...def.targets],
    combat: { ...def.combat }
  }));
}

function cloneEnemyDefs(enemyDefs: readonly EnemyDef[] | undefined): readonly EnemyDef[] {
  return (enemyDefs ?? []).map((def) => ({
    ...def,
    traits: [...def.traits]
  }));
}

function cloneCommand(command: Command): Command {
  return { ...command };
}

export function createGame(
  config: LevelConfig,
  seed: number,
  options: GameOptions = {}
): GameState {
  if (!Number.isInteger(seed)) {
    throw new Error("Game seed must be an integer.");
  }

  const configSnapshot = cloneLevelConfig(config);
  const mapSnapshot = options.map ? cloneMapDef(options.map) : undefined;

  return {
    config: configSnapshot,
    configId: configSnapshot.id,
    mapId: configSnapshot.mapId,
    seed,
    tick: 0,
    phase: "setup",
    towerDefsById: indexTowerDefs(cloneTowerDefs(options.towerDefs)),
    enemyDefsById: indexEnemyDefs(cloneEnemyDefs(options.enemyDefs)),
    ...(mapSnapshot ? { map: mapSnapshot } : {}),
    meters: { ...configSnapshot.startingState },
    towers: [],
    enemies: [],
    projectiles: [],
    alerts: [],
    buildIntent: {},
    selection: {},
    hover: {},
    completedWaveIds: [],
    commandHistory: [],
    eventLog: createEventLog(200)
  };
}

function buildTower(state: GameState, command: Extract<Command, { type: "BuildTower" }>): GameState {
  const towerDef = state.towerDefsById[command.towerId];
  const pad = state.map?.buildPads.find((candidate) => candidate.id === command.padId);

  if (
    (state.phase !== "setup" && state.phase !== "recap") ||
    !towerDef ||
    !pad ||
    !state.config.availableTowerIds.includes(command.towerId) ||
    !pad.allowedTowerKinds.includes(towerDef.kind) ||
    state.towers.some((tower) => tower.padId === command.padId) ||
    state.meters.buildBudget < towerDef.cost
  ) {
    return state;
  }

  return {
    ...state,
    meters: {
      ...state.meters,
      buildBudget: state.meters.buildBudget - towerDef.cost
    },
    towers: [
      ...state.towers,
      {
        id: `${command.towerId}@${command.padId}#${String(state.towers.length)}`,
        towerId: command.towerId,
        padId: command.padId,
        cooldownRemainingTicks: 0
      }
    ],
    eventLog: pushEvent(state.eventLog, {
      tick: state.tick,
      type: "tower.built",
      towerId: command.towerId,
      padId: command.padId
    })
  };
}

function startWave(state: GameState, command: Extract<Command, { type: "StartWave" }>): GameState {
  const wave = nextIncompleteWave(state);

  if (wave?.id !== command.waveId || (state.phase !== "setup" && state.phase !== "recap")) {
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

function applyCommand(state: GameState, command: Command): GameState {
  switch (command.type) {
    case "BuildTower":
      return buildTower(state, command);
    case "SetBuildIntent":
      return {
        ...state,
        buildIntent: { towerId: command.towerId },
        eventLog: pushEvent(state.eventLog, {
          tick: state.tick,
          type: "build-intent.changed",
          towerId: command.towerId
        })
      };
    case "ClearBuildIntent":
      return {
        ...state,
        buildIntent: {},
        eventLog: pushEvent(state.eventLog, { tick: state.tick, type: "build-intent.changed" })
      };
    case "SelectEntity":
      return {
        ...state,
        selection: { entityId: command.entityId },
        eventLog: pushEvent(state.eventLog, {
          tick: state.tick,
          type: "selection.changed",
          entityId: command.entityId
        })
      };
    case "ClearSelection":
      return {
        ...state,
        selection: {},
        eventLog: pushEvent(state.eventLog, { tick: state.tick, type: "selection.changed" })
      };
    case "SetHover":
      return {
        ...state,
        hover: { entityId: command.entityId },
        eventLog: pushEvent(state.eventLog, {
          tick: state.tick,
          type: "hover.changed",
          entityId: command.entityId
        })
      };
    case "ClearHover":
      return {
        ...state,
        hover: {},
        eventLog: pushEvent(state.eventLog, { tick: state.tick, type: "hover.changed" })
      };
    case "StartWave":
      return startWave(state, command);
  }
}

export function step(state: GameState, commands: readonly Command[] = []): GameState {
  const commandState = commands.reduce((current, command) => {
    const recorded = {
      ...current,
      commandHistory: [...current.commandHistory, { tick: current.tick, command: cloneCommand(command) }],
      eventLog: pushEvent(current.eventLog, {
        tick: current.tick,
        type: "command.received",
        commandType: command.type
      })
    };

    return applyCommand(recorded, command);
  }, state);

  const waveState =
    commandState.phase === "wave" && commandState.activeWaveStartedTick !== undefined
      ? updatePressure(spawnDueEnemies(moveEnemiesAndApplyLeaks(commandState)))
      : commandState;
  const nextState = maybeEndWave(waveState);

  return { ...nextState, tick: nextState.tick + 1 };
}

function activeWave(state: GameState): WaveDef | undefined {
  return state.config.waves.find((wave) => wave.id === state.activeWaveId);
}

function elapsedWaveTick(state: GameState): number {
  return state.tick - (state.activeWaveStartedTick ?? state.tick);
}

function enemyInstanceId(waveId: string, spawnIndex: number, memberIndex: number): string {
  return `enemy:${waveId}:${String(spawnIndex)}:${String(memberIndex)}`;
}

function derivePressure(enemies: readonly SnapshotEnemy[]): number {
  let activeCount = 0;
  let nearLeakCount = 0;

  for (const enemy of enemies) {
    if (enemy.status !== "active") {
      continue;
    }

    activeCount += 1;

    if (enemy.progress >= 0.75) {
      nearLeakCount += 1;
    }
  }

  return activeCount + nearLeakCount * 2;
}

function updatePressure(state: GameState): GameState {
  return { ...state, meters: { ...state.meters, pressure: derivePressure(state.enemies) } };
}

function moveEnemiesAndApplyLeaks(state: GameState): GameState {
  const wave = activeWave(state);

  if (!wave) {
    return state;
  }

  let townHealth = state.meters.townHealth;
  let eventLog = state.eventLog;
  const enemies: SnapshotEnemy[] = [];

  for (const enemy of state.enemies) {
    if (enemy.status !== "active") {
      enemies.push(enemy);
      continue;
    }

    const enemyDef = state.enemyDefsById[enemy.enemyId];
    const path = state.map?.paths.find((candidate) => candidate.id === enemy.pathId);

    if (!enemyDef || !path) {
      enemies.push(enemy);
      continue;
    }

    const progress = Math.min(1, enemy.progress + enemyDef.speed / path.length);

    if (progress >= 1) {
      townHealth = Math.max(0, townHealth - enemyDef.leakDamage);
      eventLog = pushEvent(eventLog, {
        tick: state.tick,
        type: "enemy.leaked",
        enemyInstanceId: enemy.id,
        enemyId: enemy.enemyId,
        waveId: wave.id,
        pathId: enemy.pathId,
        leakDamage: enemyDef.leakDamage
      });
      continue;
    }

    enemies.push({ ...enemy, progress });
  }

  return {
    ...state,
    meters: { ...state.meters, townHealth },
    enemies,
    eventLog
  };
}

function spawnDueEnemies(state: GameState): GameState {
  const wave = activeWave(state);

  if (!wave) {
    return state;
  }

  const elapsed = elapsedWaveTick(state);
  let eventLog = state.eventLog;
  let enemies: SnapshotEnemy[] | undefined;

  for (let spawnIndex = 0; spawnIndex < wave.spawns.length; spawnIndex += 1) {
    const spawn = wave.spawns[spawnIndex];

    if (!spawn || elapsed < spawn.tick) {
      continue;
    }

    const relativeTick = elapsed - spawn.tick;

    if (relativeTick % spawn.intervalTicks !== 0) {
      continue;
    }

    const memberIndex = relativeTick / spawn.intervalTicks;

    if (memberIndex >= spawn.count) {
      continue;
    }

    const enemyDef = state.enemyDefsById[spawn.enemyId];
    const path = state.map?.paths.find((candidate) => candidate.id === spawn.pathId);

    if (!enemyDef || !path) {
      continue;
    }

    enemies ??= [...state.enemies];

    const id = enemyInstanceId(wave.id, spawnIndex, memberIndex);
    enemies.push({
      id,
      enemyId: spawn.enemyId,
      pathId: spawn.pathId,
      progress: 0,
      health: enemyDef.maxHealth,
      status: "active"
    });
    eventLog = pushEvent(eventLog, {
      tick: state.tick,
      type: "enemy.spawned",
      enemyInstanceId: id,
      enemyId: spawn.enemyId,
      waveId: wave.id,
      pathId: spawn.pathId
    });
  }

  if (!enemies) {
    return state;
  }

  return { ...state, enemies, eventLog };
}

function nextIncompleteWave(state: GameState): WaveDef | undefined {
  return state.config.waves.find((wave) => !state.completedWaveIds.includes(wave.id));
}

function hasCompletedAllWaves(
  state: GameState,
  completedWaveIds: readonly string[] = state.completedWaveIds
): boolean {
  return state.config.waves.every((wave) => completedWaveIds.includes(wave.id));
}

function maybeEndWave(state: GameState): GameState {
  const elapsed = elapsedWaveTick(state);
  const wave = activeWave(state);
  const lastSpawnTick = finalSpawnElapsedTick(wave);

  if (!wave || elapsed <= lastSpawnTick || state.enemies.some((enemy) => enemy.status === "active")) {
    return state;
  }

  const completedWaveIds = [...state.completedWaveIds, wave.id];
  return {
    config: state.config,
    configId: state.configId,
    mapId: state.mapId,
    seed: state.seed,
    tick: state.tick,
    phase: hasCompletedAllWaves(state, completedWaveIds) ? "complete" : "recap",
    towerDefsById: state.towerDefsById,
    enemyDefsById: state.enemyDefsById,
    ...(state.map ? { map: state.map } : {}),
    meters: { ...state.meters, buildBudget: state.meters.buildBudget + wave.budgetReward, pressure: 0 },
    towers: state.towers,
    enemies: state.enemies,
    projectiles: state.projectiles,
    alerts: state.alerts,
    buildIntent: state.buildIntent,
    selection: state.selection,
    hover: state.hover,
    completedWaveIds,
    commandHistory: state.commandHistory,
    eventLog: pushEvent(state.eventLog, {
      tick: state.tick,
      type: "wave.ended",
      waveId: wave.id
    })
  };
}

function finalSpawnElapsedTick(wave: WaveDef | undefined): number {
  if (!wave) {
    return 0;
  }

  return Math.max(
    0,
    ...wave.spawns.map((spawn) => spawn.tick + (spawn.count - 1) * spawn.intervalTicks)
  );
}

function rangePreviews(state: GameState): SimSnapshot["previews"]["ranges"] {
  const towerId = state.buildIntent.towerId;
  if (!towerId) {
    return [];
  }

  const towerDef = state.towerDefsById[towerId];
  if (!towerDef || !state.map) {
    return [];
  }

  return state.map.buildPads
    .filter((pad) => pad.allowedTowerKinds.includes(towerDef.kind))
    .map((pad) => ({ towerId, padId: pad.id, radius: towerDef.range }));
}

export function toSnapshot(state: GameState): SimSnapshot {
  const nextWave = nextIncompleteWave(state);

  return {
    tick: state.tick,
    phase: state.phase,
    meters: { ...state.meters },
    towers: state.towers.map((tower) => ({ ...tower })),
    enemies: state.enemies.map((enemy) => ({ ...enemy })),
    projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
    alerts: [...state.alerts],
    buildIntent: { ...state.buildIntent },
    selection: { ...state.selection },
    hover: { ...state.hover },
    previews: {
      ranges: rangePreviews(state),
      connections: [],
      ...(nextWave
        ? {
            nextWave: {
              waveId: nextWave.id,
              enemyKinds: [...nextWave.preview.enemyKinds],
              pressure: nextWave.preview.pressure,
              hint: nextWave.preview.hint
            }
          }
        : {})
    },
    ...(state.activeWaveId ? { activeWaveId: state.activeWaveId } : {})
  };
}
