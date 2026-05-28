import Ajv from "ajv";
import { Type, type Static } from "@sinclair/typebox";

const MeterConditionSchema = Type.Object(
  {
    kind: Type.Union([Type.Literal("trust-at-least"), Type.Literal("trust-below")]),
    value: Type.Number()
  },
  { additionalProperties: false }
);

const LevelConfigSchema = Type.Object(
  {
    id: Type.String({ minLength: 1 }),
    mapId: Type.String({ minLength: 1 }),
    startingState: Type.Object(
      {
        budget: Type.Number(),
        trust: Type.Number()
      },
      { additionalProperties: false }
    ),
    startingBuildings: Type.Array(Type.Unknown()),
    availableBuildings: Type.Array(Type.Unknown()),
    waves: Type.Array(Type.Unknown()),
    winCondition: MeterConditionSchema,
    lossCondition: MeterConditionSchema,
    recaps: Type.Array(Type.Unknown())
  },
  { additionalProperties: false }
);

export type LevelConfig = Static<typeof LevelConfigSchema>;

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(LevelConfigSchema);

export type ValidationResult =
  | { readonly ok: true; readonly value: LevelConfig }
  | { readonly ok: false; readonly errors: readonly string[] };

export function validateLevelConfig(value: unknown): ValidationResult {
  if (validate(value)) {
    return { ok: true, value };
  }

  return {
    ok: false,
    errors: validate.errors?.map((error) => `${error.instancePath} ${error.message ?? ""}`) ?? []
  };
}
