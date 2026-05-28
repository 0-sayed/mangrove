import { describe, expect, it } from "vitest";

import { createEventLog, pushEvent } from "@sim/event-log";

describe("sim event log", () => {
  it("keeps the most recent events within the configured limit", () => {
    const log = createEventLog(2);

    const next = pushEvent(
      pushEvent(pushEvent(log, { tick: 1, type: "bootstrap.started", message: "started" }), {
        tick: 2,
        type: "bootstrap.tick",
        message: "tick"
      }),
      { tick: 3, type: "bootstrap.ready", message: "ready" }
    );

    expect(next.events).toEqual([
      { tick: 2, type: "bootstrap.tick", message: "tick" },
      { tick: 3, type: "bootstrap.ready", message: "ready" }
    ]);
  });

  it("rejects non-positive limits", () => {
    expect(() => createEventLog(0)).toThrow("positive integer");
  });
});
