import { describe, expect, it } from "vitest";

import { createSeededRng } from "@sim/rng";

describe("seeded rng", () => {
  it("returns the same sequence for the same seed", () => {
    const first = createSeededRng(123);
    const second = createSeededRng(123);

    expect([first.nextInt(), first.nextInt(), first.nextInt()]).toEqual([
      second.nextInt(),
      second.nextInt(),
      second.nextInt()
    ]);
  });

  it("advances the sequence on each read", () => {
    const rng = createSeededRng(123);
    const values = [rng.nextInt(), rng.nextInt(), rng.nextInt()];

    expect(values.every(Number.isInteger)).toBe(true);
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});
