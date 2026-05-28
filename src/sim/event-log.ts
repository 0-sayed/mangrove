export interface SimEvent {
  readonly tick: number;
  readonly type: string;
  readonly message: string;
}

export interface EventLog {
  readonly limit: number;
  readonly events: readonly SimEvent[];
}

export function createEventLog(limit: number): EventLog {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Event log limit must be a positive integer.");
  }

  return {
    limit,
    events: []
  };
}

export function pushEvent(log: EventLog, event: SimEvent): EventLog {
  return {
    limit: log.limit,
    events: [...log.events, event].slice(-log.limit)
  };
}
