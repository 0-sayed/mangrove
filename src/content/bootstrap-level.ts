import type { LevelConfig } from "@content/schemas";

export const bootstrapLevel: LevelConfig = {
  id: "message-festival-bootstrap",
  mapId: "map-bootstrap",
  startingState: {
    budget: 50,
    trust: 100
  },
  startingBuildings: [],
  availableBuildings: [],
  waves: [],
  winCondition: {
    kind: "trust-at-least",
    value: 70
  },
  lossCondition: {
    kind: "trust-below",
    value: 70
  },
  recaps: []
};
