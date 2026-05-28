import { createEventLog, pushEvent, type SimEvent } from "@sim/event-log";

export interface BootstrapSnapshot {
  readonly tick: number;
  readonly phase: "bootstrap";
  readonly meters: {
    readonly trust: number;
    readonly budget: number;
    readonly backlog: number;
  };
  readonly recentEvents: readonly SimEvent[];
}

export function createBootstrapSnapshot(): BootstrapSnapshot {
  const log = pushEvent(createEventLog(5), {
    tick: 0,
    type: "bootstrap.ready",
    message: "Runtime shell ready"
  });

  return {
    tick: 0,
    phase: "bootstrap",
    meters: {
      trust: 100,
      budget: 50,
      backlog: 0
    },
    recentEvents: log.events
  };
}
