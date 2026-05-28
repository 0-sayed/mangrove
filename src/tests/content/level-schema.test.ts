import { describe, expect, it } from "vitest";

import { validateLevelConfig } from "@content/schemas";

describe("level config schema", () => {
  it("accepts the bootstrap placeholder level shape", () => {
    const result = validateLevelConfig({
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
    });

    expect(result.ok).toBe(true);
  });

  it("reports validation errors for invalid level shapes", () => {
    const result = validateLevelConfig({
      id: "",
      mapId: "map-bootstrap"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("Expected invalid level config.");
    }
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
