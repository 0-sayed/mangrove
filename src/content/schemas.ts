import Ajv from "ajv";
import { Type, type Static, type TSchema } from "@sinclair/typebox";

const IdSchema = Type.String({ minLength: 1 });
const NonNegativeNumberSchema = Type.Number({ minimum: 0 });
const PositiveIntegerSchema = Type.Integer({ minimum: 1 });
const MeterSchema = Type.Union([Type.Literal("trust"), Type.Literal("budget"), Type.Literal("backlog")]);
const BuildingRoleSchema = Type.Union([Type.Literal("api-gate"), Type.Literal("queue-hub"), Type.Literal("worker-yard")]);
const MessageTypeSchema = Type.Union([Type.Literal("useful")]);
const MessageStatusSchema = Type.Union([
  Type.Literal("spawned"),
  Type.Literal("accepted"),
  Type.Literal("queued"),
  Type.Literal("processing"),
  Type.Literal("delivered"),
  Type.Literal("dropped"),
  Type.Literal("expired")
]);

const MeterConditionSchema = Type.Object(
  {
    kind: Type.Union([Type.Literal("trust-at-least"), Type.Literal("trust-below")]),
    value: Type.Number()
  },
  { additionalProperties: false }
);

const StartingStateSchema = Type.Object(
  {
    budget: NonNegativeNumberSchema,
    trust: NonNegativeNumberSchema,
    backlog: NonNegativeNumberSchema,
    workerCount: PositiveIntegerSchema
  },
  { additionalProperties: false }
);

const StartingBuildingSchema = Type.Object(
  {
    defId: IdSchema,
    slotId: IdSchema
  },
  { additionalProperties: false }
);

const SpawnScheduleItemSchema = Type.Object(
  {
    tick: Type.Integer({ minimum: 0 }),
    messageType: MessageTypeSchema,
    count: PositiveIntegerSchema
  },
  { additionalProperties: false }
);

const WaveDefSchema = Type.Object(
  {
    id: IdSchema,
    durationTicks: PositiveIntegerSchema,
    timeoutTicks: PositiveIntegerSchema,
    spawnSchedule: Type.Array(SpawnScheduleItemSchema),
    messageTypes: Type.Array(MessageTypeSchema),
    recapId: IdSchema
  },
  { additionalProperties: false }
);

const RecapSchema = Type.Object(
  {
    id: IdSchema,
    lines: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, maxItems: 3 })
  },
  { additionalProperties: false }
);

const LevelConfigSchema = Type.Object(
  {
    id: IdSchema,
    mapId: IdSchema,
    startingState: StartingStateSchema,
    startingBuildings: Type.Array(StartingBuildingSchema),
    availableBuildings: Type.Array(IdSchema),
    waves: Type.Array(WaveDefSchema),
    winCondition: MeterConditionSchema,
    lossCondition: MeterConditionSchema,
    recaps: Type.Array(RecapSchema)
  },
  { additionalProperties: false }
);

const PathMetadataSchema = Type.Object(
  {
    id: IdSchema,
    spawnId: IdSchema,
    exitId: IdSchema,
    nodeIds: Type.Array(IdSchema, { minItems: 2 })
  },
  { additionalProperties: false }
);

const BuildSlotSchema = Type.Object(
  {
    id: IdSchema,
    role: BuildingRoleSchema,
    x: Type.Number(),
    y: Type.Number()
  },
  { additionalProperties: false }
);

const MapPointSchema = Type.Object(
  {
    id: IdSchema,
    x: Type.Number(),
    y: Type.Number()
  },
  { additionalProperties: false }
);

const MapMetadataSchema = Type.Object(
  {
    id: IdSchema,
    paths: Type.Array(PathMetadataSchema, { minItems: 1 }),
    buildSlots: Type.Array(BuildSlotSchema),
    spawns: Type.Array(MapPointSchema, { minItems: 1 }),
    exits: Type.Array(MapPointSchema, { minItems: 1 })
  },
  { additionalProperties: false }
);

const BuildingDefSchema = Type.Object(
  {
    id: IdSchema,
    role: BuildingRoleSchema,
    cost: NonNegativeNumberSchema,
    allowedSlots: Type.Array(IdSchema),
    stats: Type.Record(Type.String({ pattern: "^.+$" }), NonNegativeNumberSchema, { additionalProperties: false }),
    visibleStates: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })
  },
  { additionalProperties: false }
);

const CommandSchema = Type.Union([
  Type.Object({ type: Type.Literal("StartWave"), waveId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("PlaceBuilding"), buildingId: IdSchema, slotId: IdSchema }, { additionalProperties: false }),
  Type.Object({ type: Type.Literal("SetWorkerCount"), count: PositiveIntegerSchema }, { additionalProperties: false })
]);

const SnapshotBuildingSchema = Type.Object(
  {
    id: IdSchema,
    defId: IdSchema,
    slotId: IdSchema,
    state: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

const SnapshotMessageSchema = Type.Object(
  {
    id: IdSchema,
    type: MessageTypeSchema,
    status: MessageStatusSchema,
    pathId: IdSchema,
    ageTicks: Type.Integer({ minimum: 0 })
  },
  { additionalProperties: false }
);

const LanePressureSchema = Type.Object(
  {
    pathId: IdSchema,
    backlog: NonNegativeNumberSchema,
    dropped: NonNegativeNumberSchema
  },
  { additionalProperties: false }
);

const SimSnapshotSchema = Type.Object(
  {
    tick: Type.Integer({ minimum: 0 }),
    phase: Type.Union([Type.Literal("setup"), Type.Literal("wave"), Type.Literal("recap"), Type.Literal("complete")]),
    meters: Type.Object(
      {
        trust: NonNegativeNumberSchema,
        budget: NonNegativeNumberSchema,
        backlog: NonNegativeNumberSchema
      },
      { additionalProperties: false }
    ),
    buildings: Type.Array(SnapshotBuildingSchema),
    messages: Type.Array(SnapshotMessageSchema),
    lanePressure: Type.Array(LanePressureSchema),
    alerts: Type.Array(Type.String({ minLength: 1 })),
    workerCount: Type.Optional(PositiveIntegerSchema),
    activeWaveId: Type.Optional(IdSchema)
  },
  { additionalProperties: false }
);

const SimEventSchema = Type.Union([
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("message.spawned"), messageId: IdSchema, messageType: MessageTypeSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("message.accepted"), messageId: IdSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("message.queued"), messageId: IdSchema, queueId: IdSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    {
      tick: Type.Integer({ minimum: 0 }),
      type: Type.Literal("message.dropped"),
      messageId: IdSchema,
      reason: Type.Union([Type.Literal("direct-handoff-overflow"), Type.Literal("queue-overflow")])
    },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("worker.started"), messageId: IdSchema, workerYardId: IdSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("worker.acked"), messageId: IdSchema, workerYardId: IdSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("meter.changed"), meter: MeterSchema, delta: Type.Number(), value: NonNegativeNumberSchema },
    { additionalProperties: false }
  ),
  Type.Object(
    { tick: Type.Integer({ minimum: 0 }), type: Type.Literal("wave.ended"), waveId: IdSchema },
    { additionalProperties: false }
  )
]);

const PostWaveResultSchema = Type.Object(
  {
    waveId: IdSchema,
    delivered: NonNegativeNumberSchema,
    dropped: NonNegativeNumberSchema,
    expired: NonNegativeNumberSchema,
    backlogPeak: NonNegativeNumberSchema,
    trustDelta: Type.Number(),
    budgetDelta: Type.Number(),
    playerActionsUsed: Type.Array(CommandSchema),
    revealedBackendTerm: Type.String({ minLength: 1 }),
    revealedLaw: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

export type LevelConfig = Static<typeof LevelConfigSchema>;
export type MapMetadata = Static<typeof MapMetadataSchema>;
export type BuildingDef = Static<typeof BuildingDefSchema>;
export type WaveDef = Static<typeof WaveDefSchema>;
export type Command = Static<typeof CommandSchema>;
export type SimSnapshot = Static<typeof SimSnapshotSchema>;
export type SimEvent = Static<typeof SimEventSchema>;
export type PostWaveResult = Static<typeof PostWaveResultSchema>;

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

export const validateLevelConfig = createValidator<LevelConfig>(LevelConfigSchema);
export const validateMapMetadata = createValidator<MapMetadata>(MapMetadataSchema);
export const validateBuildingDef = createValidator<BuildingDef>(BuildingDefSchema);
export const validateWaveDef = createValidator<WaveDef>(WaveDefSchema);
export const validateCommand = createValidator<Command>(CommandSchema);
export const validateSimSnapshot = createValidator<SimSnapshot>(SimSnapshotSchema);
export const validateSimEvent = createValidator<SimEvent>(SimEventSchema);
export const validatePostWaveResult = createValidator<PostWaveResult>(PostWaveResultSchema);
