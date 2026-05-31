import { describe, expect, it } from "vitest";

import { calculateNextRunAdvanceTime, calculateRunCatchUpTicks } from "@app/useGameRun";
import { RUN_TICK_INTERVAL_MS } from "@app/run-controller";

describe("useGameRun", () => {
  it("caps delayed interval catch-up ticks", () => {
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS * 20)).toBe(10);
  });

  it("scales catch-up ticks by selected run speed", () => {
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS, 1)).toBe(1);
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS, 2)).toBe(2);
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS, 4)).toBe(4);
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS, 0)).toBe(0);
  });

  it("advances catch-up timing only by capped simulation ticks", () => {
    const elapsedTicks = calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS * 20, 4);

    expect(elapsedTicks).toBe(10);
    expect(calculateNextRunAdvanceTime(0, elapsedTicks, 4)).toBe(2.5 * RUN_TICK_INTERVAL_MS);
  });
});
