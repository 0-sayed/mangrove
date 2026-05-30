import { describe, expect, it } from "vitest";

import { calculateRunCatchUpTicks } from "@app/useGameRun";
import { RUN_TICK_INTERVAL_MS } from "@app/run-controller";

describe("useGameRun", () => {
  it("caps delayed interval catch-up ticks", () => {
    expect(calculateRunCatchUpTicks(0, RUN_TICK_INTERVAL_MS * 20)).toBe(10);
  });
});
