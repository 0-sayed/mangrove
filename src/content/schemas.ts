import Ajv from "ajv";
import { Type, type Static, type TSchema } from "@sinclair/typebox";

const IdSchema = Type.String({ minLength: 1 });
const NonNegativeNumberSchema = Type.Number({ minimum: 0 });
const PositiveNumberSchema = Type.Number({ exclusiveMinimum: 0 });
const PositiveIntegerSchema = Type.Integer({ minimum: 1 });
const GridPointSchema = Type.Object({ x: Type.Number(), y: Type.Number() }, { additionalProperties: false });

const TowerKindSchema = Type.Union([Type.Literal("worker"), Type.Literal("queue"), Type.Literal("load-balancer")]);

const EnemyKindSchema = Type.Union([Type.Literal("request-runner"), Type.Literal("burst-swarm"), Type.Literal("heavy-payload")]);

const PressureLevelSchema = Type.Union([Type.Literal("low"), Type.Literal("medium"), Type.Literal("high")]);

const TargetTagSchema = Type.Union([Type.Literal("ground"), Type.Literal("swarm"), Type.Literal("heavy")]);

const SimPhaseSchema = Type.Union([Type.Literal("setup"), Type.Literal("wave"), Type.Literal("recap"), Type.Literal("complete")]);

const PathDefSchema = Type.Object(
  {
    id: IdSchema,
    portalId: IdSchema,
    coreId: IdSchema,
    points: Type.Array(GridPointSchema, { minItems: 2 }),
    length: PositiveNumberSchema
  },
  { additionalProperties: false }
);

const BuildPadDefSchema = Type.Object(
  {
    id: IdSchema,
    x: Type.Number(),
    y: Type.Number(),
    allowedTowerKinds: Type.Array(TowerKindSchema, { minItems: 1 })
  },
  { additionalProperties: false }
);

const MapPointSchema = Type.Object({ id: IdSchema, x: Type.Number(), y: Type.Number() }, { additionalProperties: false });

const MapDefSchema = Type.Object(
  {
    id: IdSchema,
    size: Type.Object({ width: PositiveNumberSchema, height: PositiveNumberSchema }, { additionalProperties: false }),
    paths: Type.Array(PathDefSchema, { minItems: 1 }),
    buildPads: Type.Array(BuildPadDefSchema),
    portals: Type.Array(MapPointSchema, { minItems: 1 }),
    cores: Type.Array(MapPointSchema, { minItems: 1 })
  },
  { additionalProperties: false }
);

const TowerCombatSchema = Type.Object(
  {
    damage: NonNegativeNumberSchema,
    cooldownTicks: PositiveIntegerSchema
  },
  { additionalProperties: false }
);

const TowerDefSchema = Type.Object(
  {
    id: IdSchema,
    kind: TowerKindSchema,
    displayName: Type.String({ minLength: 1 }),
    cost: NonNegativeNumberSchema,
    range: NonNegativeNumberSchema,
    targets: Type.Array(TargetTagSchema, { minItems: 1 }),
    combat: TowerCombatSchema,
    softwareShadow: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

const EnemyDefSchema = Type.Object(
  {
    id: IdSchema,
    kind: EnemyKindSchema,
    displayName: Type.String({ minLength: 1 }),
    maxHealth: PositiveNumberSchema,
    speed: PositiveNumberSchema,
    leakDamage: PositiveIntegerSchema,
    reward: NonNegativeNumberSchema,
    traits: Type.Array(Type.String({ minLength: 1 }))
  },
  { additionalProperties: false }
);

const WaveSpawnSchema = Type.Object(
  {
    tick: Type.Integer({ minimum: 0 }),
    enemyId: IdSchema,
    pathId: IdSchema,
    count: PositiveIntegerSchema,
    intervalTicks: PositiveIntegerSchema
  },
  { additionalProperties: false }
);

const WavePreviewSchema = Type.Object(
  {
    waveId: IdSchema,
    enemyKinds: Type.Array(EnemyKindSchema, { minItems: 1 }),
    pressure: PressureLevelSchema,
    hint: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

const WaveDefSchema = Type.Object(
  {
    id: IdSchema,
    displayName: Type.String({ minLength: 1 }),
    preview: Type.Omit(WavePreviewSchema, ["waveId"]),
    spawns: Type.Array(WaveSpawnSchema),
    budgetReward: NonNegativeNumberSchema
  },
  { additionalProperties: false }
);

const StartingStateSchema = Type.Object(
  {
    townHealth: PositiveIntegerSchema,
    buildBudget: NonNegativeNumberSchema,
    pressure: NonNegativeNumberSchema
  },
  { additionalProperties: false }
);

const SnapshotMetersSchema = Type.Object(
  {
    townHealth: NonNegativeNumberSchema,
    buildBudget: NonNegativeNumberSchema,
    pressure: NonNegativeNumberSchema
  },
  { additionalProperties: false }
);

const RecapLawSchema = Type.Object(
  {
    id: IdSchema,
    afterWaveId: IdSchema,
    text: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

const LevelConfigSchema = Type.Object(
  {
    id: IdSchema,
    mapId: IdSchema,
    startingState: StartingStateSchema,
    availableTowerIds: Type.Array(IdSchema),
    waves: Type.Array(WaveDefSchema, { minItems: 1 }),
    recapLaws: Type.Array(RecapLawSchema)
  },
  { additionalProperties: false }
);

const CommandSchema = Type.Union([
  Type.Object({ type: Type.Literal("StartWave"), waveId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("BuildTower"), towerId: IdSchema, padId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("SetBuildIntent"), towerId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("ClearBuildIntent") }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("SelectEntity"), entityId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("ClearSelection") }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("SetHover"), entityId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("ClearHover") }, { additionalProperties: false })
]);

const BuildIntentSchema = Type.Object({ towerId: Type.Optional(IdSchema) }, { additionalProperties: false });
const SelectionStateSchema = Type.Object({ entityId: Type.Optional(IdSchema) }, { additionalProperties: false });
const HoverStateSchema = Type.Object({ entityId: Type.Optional(IdSchema) }, { additionalProperties: false });

const RangePreviewSchema = Type.Object(
  { towerId: IdSchema, padId: IdSchema, radius: NonNegativeNumberSchema },
  { additionalProperties: false }
);

const ConnectionPreviewSchema = Type.Object(
  {
    sourceId: IdSchema,
    targetIds: Type.Array(IdSchema, { minItems: 1 }),
    kind: Type.Union([
      Type.Literal("coverage-overlap"),
      Type.Literal("stall-window"),
      Type.Literal("weak-coverage"),
      Type.Literal("overload-warning"),
      Type.Literal("route-influence"),
      Type.Literal("support-aura")
    ])
  },
  { additionalProperties: false }
);

const SnapshotTowerSchema = Type.Object(
  {
    id: IdSchema,
    towerId: IdSchema,
    padId: IdSchema,
    cooldownRemainingTicks: Type.Integer({ minimum: 0 })
  },
  { additionalProperties: false }
);

const SnapshotEnemySchema = Type.Object(
  {
    id: IdSchema,
    enemyId: IdSchema,
    pathId: IdSchema,
    progress: Type.Number({ minimum: 0 }),
    health: NonNegativeNumberSchema,
    status: Type.Union([Type.Literal("active"), Type.Literal("resolved"), Type.Literal("leaked")]),
    stallRemainingTicks: Type.Optional(Type.Integer({ minimum: 0 }))
  },
  { additionalProperties: false }
);

const SnapshotProjectileSchema = Type.Object(
  {
    id: IdSchema,
    towerInstanceId: IdSchema,
    enemyInstanceId: IdSchema,
    progress: Type.Number({ minimum: 0, maximum: 1 })
  },
  { additionalProperties: false }
);

const SnapshotPreviewsSchema = Type.Object(
  {
    ranges: Type.Array(RangePreviewSchema),
    connections: Type.Array(ConnectionPreviewSchema),
    nextWave: Type.Optional(WavePreviewSchema)
  },
  { additionalProperties: false }
);

const SimSnapshotSchema = Type.Object(
  {
    tick: Type.Integer({ minimum: 0 }),
    phase: SimPhaseSchema,
    meters: SnapshotMetersSchema,
    towers: Type.Array(SnapshotTowerSchema),
    enemies: Type.Array(SnapshotEnemySchema),
    projectiles: Type.Array(SnapshotProjectileSchema),
    alerts: Type.Array(Type.String({ minLength: 1 })),
    buildIntent: BuildIntentSchema,
    selection: SelectionStateSchema,
    hover: HoverStateSchema,
    previews: SnapshotPreviewsSchema,
    activeWaveId: Type.Optional(IdSchema)
  },
  { additionalProperties: false }
);

const SimEventSchema = Type.Union([
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("command.received"), commandType: Type.String({ minLength: 1 }) },
    { additionalProperties: false }
  ),
  Type.Object({ tick: Type.Integer({ minimum: 0 }), type: Type.Literal("wave.started"), waveId: IdSchema }, { additionalProperties: false }),
  Type.Object({ tick: Type.Integer({ minimum: 0 }), type: Type.Literal("wave.ended"), waveId: IdSchema }, { additionalProperties: false }),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("enemy.spawned"),
      enemyInstanceId: IdSchema,
      enemyId: IdSchema,
      waveId: IdSchema,
      pathId: IdSchema
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("enemy.leaked"),
      enemyInstanceId: IdSchema,
      enemyId: IdSchema,
      waveId: IdSchema,
      pathId: IdSchema,
      leakDamage: PositiveIntegerSchema
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("tower.fired"),
      towerInstanceId: IdSchema,
      towerId: IdSchema,
      enemyInstanceId: IdSchema,
      enemyId: IdSchema,
      damage: NonNegativeNumberSchema,
      projectileId: IdSchema
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("enemy.resolved"),
      enemyInstanceId: IdSchema,
      enemyId: IdSchema,
      waveId: IdSchema,
      pathId: IdSchema,
      reward: NonNegativeNumberSchema
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("enemy.stalled"),
      towerInstanceId: IdSchema,
      enemyInstanceId: IdSchema,
      durationTicks: PositiveIntegerSchema
    },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("enemy.routed"),
      towerInstanceId: IdSchema,
      enemyInstanceId: IdSchema,
      enemyId: IdSchema,
      waveId: IdSchema,
      fromPathId: IdSchema,
      toPathId: IdSchema,
      reason: Type.Literal("healthier-coverage")
    },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("tower.built"), towerId: IdSchema, padId: IdSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("build-intent.changed"), towerId: Type.Optional(IdSchema) },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("selection.changed"), entityId: Type.Optional(IdSchema) },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("hover.changed"), entityId: Type.Optional(IdSchema) },
    { additionalProperties: false }
  )
]);

export type PathDef = Static<typeof PathDefSchema>;
export type BuildPadDef = Static<typeof BuildPadDefSchema>;
export type MapDef = Static<typeof MapDefSchema>;
export type TowerDef = Static<typeof TowerDefSchema>;
export type EnemyDef = Static<typeof EnemyDefSchema>;
export type WaveDef = Static<typeof WaveDefSchema>;
export type LevelConfig = Static<typeof LevelConfigSchema>;
export type Command = Static<typeof CommandSchema>;
export type BuildIntent = Static<typeof BuildIntentSchema>;
export type SelectionState = Static<typeof SelectionStateSchema>;
export type HoverState = Static<typeof HoverStateSchema>;
export type RangePreview = Static<typeof RangePreviewSchema>;
export type ConnectionPreview = Static<typeof ConnectionPreviewSchema>;
export type WavePreview = Static<typeof WavePreviewSchema>;
export type SimSnapshot = Static<typeof SimSnapshotSchema>;
export type SimEvent = Static<typeof SimEventSchema>;

const ajv = new Ajv({ allErrors: true });

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly string[] };

function createValidator<T>(schema: TSchema): (value: unknown) => ValidationResult<T> {
  const validate = ajv.compile<T>(schema);

  return (value: unknown): ValidationResult<T> => {
    if (validate(value)) {
      return { ok: true, value };
    }

    return {
      ok: false,
      errors: validate.errors?.map((error) => `${error.instancePath} ${error.message ?? ""}`) ?? []
    };
  };
}

export const validatePathDef = createValidator<PathDef>(PathDefSchema);
export const validateBuildPadDef = createValidator<BuildPadDef>(BuildPadDefSchema);
export const validateMapDef = createValidator<MapDef>(MapDefSchema);
export const validateTowerDef = createValidator<TowerDef>(TowerDefSchema);
export const validateEnemyDef = createValidator<EnemyDef>(EnemyDefSchema);
export const validateWaveDef = createValidator<WaveDef>(WaveDefSchema);
export const validateLevelConfig = createValidator<LevelConfig>(LevelConfigSchema);
export const validateCommand = createValidator<Command>(CommandSchema);
export const validateBuildIntent = createValidator<BuildIntent>(BuildIntentSchema);
export const validateSelectionState = createValidator<SelectionState>(SelectionStateSchema);
export const validateHoverState = createValidator<HoverState>(HoverStateSchema);
export const validateRangePreview = createValidator<RangePreview>(RangePreviewSchema);
export const validateConnectionPreview = createValidator<ConnectionPreview>(ConnectionPreviewSchema);
export const validateWavePreview = createValidator<WavePreview>(WavePreviewSchema);
export const validateSimSnapshot = createValidator<SimSnapshot>(SimSnapshotSchema);
export const validateSimEvent = createValidator<SimEvent>(SimEventSchema);
