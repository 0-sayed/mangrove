import { describe, expect, it } from "vitest";

import { hashState, stableStringify } from "@sim/hash";

describe("sim state hash", () => {
  it("serializes object keys in a stable order", () => {
    const first = { tick: 1, meters: { townHealth: 20, buildBudget: 50, pressure: 0 } };
    const second = { meters: { buildBudget: 50, pressure: 0, townHealth: 20 }, tick: 1 };

    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(hashState(first)).toBe(hashState(second));
  });

  it("preserves array order because command order is gameplay input", () => {
    const first = [
      { type: "StartWave", waveId: "wave-normal-flow" },
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" }
    ];
    const second = [
      { type: "BuildTower", towerId: "worker-tower", padId: "pad-worker-a" },
      { type: "StartWave", waveId: "wave-normal-flow" }
    ];

    expect(hashState(first)).not.toBe(hashState(second));
  });

  it("rejects non-finite numbers", () => {
    expect(() => stableStringify({ townHealth: Number.NaN })).toThrow("finite number");
    expect(() => stableStringify({ townHealth: Number.POSITIVE_INFINITY })).toThrow("finite number");
  });

  it("rejects sparse arrays", () => {
    expect(() => stableStringify(new Array(1))).toThrow("sparse arrays");
  });

  it("rejects sparse arrays with inherited numeric properties", () => {
    Object.defineProperty(Array.prototype, "0", {
      configurable: true,
      value: "ambient",
      writable: true
    });

    try {
      expect(() => stableStringify(new Array(1))).toThrow("sparse arrays");
    } finally {
      Reflect.deleteProperty(Array.prototype, "0");
    }
  });
});
