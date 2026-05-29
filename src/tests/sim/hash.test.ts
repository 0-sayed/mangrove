import { describe, expect, it } from "vitest";

import { hashState, stableStringify } from "@sim/hash";

describe("sim state hash", () => {
  it("serializes object keys in a stable order", () => {
    const first = { tick: 1, meters: { trust: 100, budget: 50, backlog: 0 } };
    const second = { meters: { backlog: 0, budget: 50, trust: 100 }, tick: 1 };

    expect(stableStringify(first)).toBe(stableStringify(second));
    expect(hashState(first)).toBe(hashState(second));
  });

  it("preserves array order because command order is gameplay input", () => {
    const first = [{ type: "StartWave", waveId: "opening-flow" }, { type: "SetWorkerCount", count: 2 }];
    const second = [{ type: "SetWorkerCount", count: 2 }, { type: "StartWave", waveId: "opening-flow" }];

    expect(hashState(first)).not.toBe(hashState(second));
  });

  it("rejects non-finite numbers", () => {
    expect(() => stableStringify({ trust: Number.NaN })).toThrow("finite number");
    expect(() => stableStringify({ trust: Number.POSITIVE_INFINITY })).toThrow("finite number");
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
