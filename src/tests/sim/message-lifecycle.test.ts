import { describe, expect, it } from "vitest";

import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import {
  validateSimSnapshot,
  type BuildingDef,
  type LevelConfig,
  type WaveDef
} from "@content/schemas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

function runTicks(initial: GameState, ticks: number): GameState {
  let state = initial;

  for (let index = 0; index < ticks; index += 1) {
    state = step(state, []);
  }

  return state;
}

function withSingleWave(wave: WaveDef, overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    ...messageFestivalV0Level,
    ...overrides,
    waves: [
      {
        ...wave,
        spawnSchedule: wave.spawnSchedule.map((item) => ({ ...item })),
        messageTypes: [...wave.messageTypes]
      }
    ]
  };
}

function withWaves(waves: readonly WaveDef[], overrides: Partial<LevelConfig> = {}): LevelConfig {
  return {
    ...messageFestivalV0Level,
    ...overrides,
    waves: waves.map((wave) => ({
      ...wave,
      spawnSchedule: wave.spawnSchedule.map((item) => ({ ...item })),
      messageTypes: [...wave.messageTypes]
    }))
  };
}

const burstAtZero: WaveDef = {
  id: "wave-burst",
  durationTicks: 20,
  timeoutTicks: 80,
  spawnSchedule: [{ tick: 0, messageType: "useful", count: 1 }],
  messageTypes: ["useful"],
  recapId: "recap-opening-flow"
};
const contentBuildingDefs: readonly BuildingDef[] = messageFestivalV0BuildingDefs;

function mutableMapWithPath(pathId: string): typeof messageFestivalV0Map {
  return {
    ...messageFestivalV0Map,
    paths: messageFestivalV0Map.paths.map((path, index) => ({
      ...path,
      id: index === 0 ? pathId : path.id,
      nodeIds: [...path.nodeIds]
    })),
    buildSlots: messageFestivalV0Map.buildSlots.map((slot) => ({ ...slot })),
    spawns: messageFestivalV0Map.spawns.map((spawn) => ({ ...spawn })),
    exits: messageFestivalV0Map.exits.map((exit) => ({ ...exit }))
  };
}

function mutableBuildingDefs(): BuildingDef[] {
  return messageFestivalV0BuildingDefs.map((def) => ({
    ...def,
    allowedSlots: [...def.allowedSlots],
    stats: { ...def.stats },
    visibleStates: [...def.visibleStates]
  }));
}

describe("message lifecycle", () => {
  it("keeps lifecycle snapshots inside the render schema", () => {
    const started = step(
      createGame(withSingleWave(burstAtZero), 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    expect(validateSimSnapshot(toSnapshot(started)).ok).toBe(true);
  });

  it("requires map metadata before spawning lifecycle messages", () => {
    const initial = createGame(withSingleWave(burstAtZero), 123);

    expect(() => step(initial, [{ type: "StartWave", waveId: "wave-burst" }])).toThrow(
      "Map metadata"
    );
  });

  it("spawns scheduled messages and routes them to direct handoff when no queue exists", () => {
    const initial = createGame(withSingleWave(burstAtZero), 123, {
      buildingDefs: contentBuildingDefs,
      map: messageFestivalV0Map
    });
    const started = runTicks(step(initial, [{ type: "StartWave", waveId: "wave-burst" }]), 0);
    const snapshot = toSnapshot(started);

    expect(snapshot.messages).toEqual([
      {
        id: "wave-burst-message-1",
        type: "useful",
        status: "processing",
        pathId: "path-main",
        ageTicks: 0
      }
    ]);
    expect(snapshot.meters.backlog).toBe(1);
    expect(snapshot.lanePressure).toEqual([{ pathId: "path-main", backlog: 1, dropped: 0 }]);
    expect(started.eventLog.events).toEqual(
      expect.arrayContaining([
        {
          tick: 0,
          type: "message.spawned",
          messageId: "wave-burst-message-1",
          messageType: "useful"
        },
        { tick: 0, type: "message.accepted", messageId: "wave-burst-message-1" },
        {
          tick: 0,
          type: "worker.started",
          messageId: "wave-burst-message-1",
          workerYardId: "worker-yard@slot_worker_1#1"
        }
      ])
    );
  });

  it("routes accepted messages through Queue Hub when one is preplaced", () => {
    const levelWithQueue = withSingleWave(
      {
        ...burstAtZero,
        spawnSchedule: [{ tick: 0, messageType: "useful", count: 2 }]
      },
      {
        startingBuildings: [
          { defId: "api-gate", slotId: "slot_ingress_1" },
          { defId: "queue-hub", slotId: "slot_queue_1" },
          { defId: "worker-yard", slotId: "slot_worker_1" }
        ]
      }
    );

    const started = step(
      createGame(levelWithQueue, 123, {
        buildingDefs: contentBuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    expect(toSnapshot(started).messages).toEqual([
      {
        id: "wave-burst-message-1",
        type: "useful",
        status: "processing",
        pathId: "path-main",
        ageTicks: 0
      },
      {
        id: "wave-burst-message-2",
        type: "useful",
        status: "queued",
        pathId: "path-main",
        ageTicks: 0
      }
    ]);
    expect(started.eventLog.events).toContainEqual({
      tick: 0,
      type: "message.queued",
      messageId: "wave-burst-message-2",
      queueId: "queue-hub@slot_queue_1#1"
    });
  });

  it("drops the newest direct handoff message when API buffer capacity is exceeded", () => {
    const overflowWave: WaveDef = {
      ...burstAtZero,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 5 }]
    };

    const started = step(
      createGame(withSingleWave(overflowWave), 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );
    const snapshot = toSnapshot(started);

    expect(snapshot.messages.at(-1)).toEqual({
      id: "wave-burst-message-5",
      type: "useful",
      status: "dropped",
      pathId: "path-main",
      ageTicks: 0
    });
    expect(snapshot.meters.trust).toBe(97);
    expect(snapshot.meters.backlog).toBe(4);
    expect(snapshot.lanePressure).toEqual([{ pathId: "path-main", backlog: 4, dropped: 1 }]);
    expect(started.eventLog.events).toContainEqual({
      tick: 0,
      type: "message.dropped",
      messageId: "wave-burst-message-5",
      reason: "direct-handoff-overflow"
    });
  });

  it("drops the newest queued message when Queue Hub capacity is exceeded", () => {
    const overflowWave: WaveDef = {
      ...burstAtZero,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 25 }]
    };
    const levelWithQueue = withSingleWave(overflowWave, {
      startingBuildings: [
        { defId: "api-gate", slotId: "slot_ingress_1" },
        { defId: "queue-hub", slotId: "slot_queue_1" },
        { defId: "worker-yard", slotId: "slot_worker_1" }
      ]
    });

    const started = step(
      createGame(levelWithQueue, 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    expect(
      toSnapshot(started).messages.filter((message) => message.status === "dropped")
    ).toHaveLength(1);
    expect(toSnapshot(started).messages.at(-1)?.status).toBe("dropped");
    expect(toSnapshot(started).meters.trust).toBe(97);
    expect(started.eventLog.events).toContainEqual({
      tick: 0,
      type: "message.dropped",
      messageId: "wave-burst-message-25",
      reason: "queue-overflow"
    });
  });

  it("logs only actual trust change when overflow penalties clamp at zero", () => {
    const overflowWave: WaveDef = {
      ...burstAtZero,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 7 }]
    };
    const started = step(
      createGame(
        withSingleWave(overflowWave, {
          startingState: {
            ...messageFestivalV0Level.startingState,
            trust: 1
          }
        }),
        123,
        {
          buildingDefs: messageFestivalV0BuildingDefs,
          map: messageFestivalV0Map
        }
      ),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );
    const trustEvents = started.eventLog.events.filter(
      (event) => event.type === "meter.changed" && event.meter === "trust"
    );

    expect(toSnapshot(started).meters.trust).toBe(0);
    expect(trustEvents).toEqual([
      { tick: 0, type: "meter.changed", meter: "trust", delta: -1, value: 0 }
    ]);
    expect(
      toSnapshot(started).messages.filter((message) => message.status === "dropped")
    ).toHaveLength(3);
    expect(
      started.eventLog.events.filter(
        (event) => event.type === "message.dropped" && event.reason === "direct-handoff-overflow"
      )
    ).toHaveLength(3);
  });

  it("snapshots lifecycle content inputs when creating game state", () => {
    const level = withSingleWave(burstAtZero);
    const map = mutableMapWithPath("path-original");
    const buildingDefs = mutableBuildingDefs();
    const initial = createGame(level, 123, { buildingDefs, map });
    const wave = level.waves[0];
    const firstPath = map.paths[0];
    const workerYard = buildingDefs.find((def) => def.id === "worker-yard");

    if (!wave || !firstPath || !workerYard) {
      throw new Error("Expected mutable lifecycle content fixtures.");
    }

    wave.spawnSchedule = [{ tick: 1, messageType: "useful", count: 2 }];
    firstPath.id = "path-mutated";
    delete workerYard.stats.processingTicks;

    const started = step(initial, [{ type: "StartWave", waveId: "wave-burst" }]);

    expect(toSnapshot(started).messages).toEqual([
      {
        id: "wave-burst-message-1",
        type: "useful",
        status: "processing",
        pathId: "path-original",
        ageTicks: 0
      }
    ]);
    expect(started.eventLog.events).toContainEqual({
      tick: 0,
      type: "worker.started",
      messageId: "wave-burst-message-1",
      workerYardId: "worker-yard@slot_worker_1#1"
    });
  });

  it("acks completed worker messages and awards budget", () => {
    const started = step(
      createGame(withSingleWave(burstAtZero), 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    const resolved = runTicks(started, 10);

    expect(toSnapshot(resolved).messages[0]).toEqual({
      id: "wave-burst-message-1",
      type: "useful",
      status: "delivered",
      pathId: "path-main",
      ageTicks: 10
    });
    expect(toSnapshot(resolved).meters.budget).toBe(51);
    expect(toSnapshot(resolved).meters.backlog).toBe(0);
    expect(resolved.eventLog.events).toContainEqual({
      tick: 10,
      type: "worker.acked",
      messageId: "wave-burst-message-1",
      workerYardId: "worker-yard@slot_worker_1#1"
    });
  });

  it("expires useful messages that wait beyond patience and penalizes trust", () => {
    const blockedWave: WaveDef = {
      ...burstAtZero,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 2 }]
    };
    const slowWorkerDefs: readonly BuildingDef[] = messageFestivalV0BuildingDefs.map((def) =>
      def.id === "worker-yard"
        ? {
            ...def,
            stats: {
              ...def.stats,
              processingTicks: 200
            }
          }
        : def
    );
    const initial = createGame(
      withWaves([blockedWave, { ...burstAtZero, id: "wave-followup" }]),
      123,
      {
        buildingDefs: slowWorkerDefs,
        map: messageFestivalV0Map
      }
    );

    const started = step(initial, [{ type: "StartWave", waveId: "wave-burst" }]);
    const expired = runTicks(started, 120);

    expect(toSnapshot(expired).messages.map((message) => message.status)).toEqual([
      "expired",
      "expired"
    ]);
    expect(toSnapshot(expired).meters.trust).toBe(96);
    expect(toSnapshot(expired).meters.backlog).toBe(0);
  });

  it("expires at the patience boundary before worker ack can complete", () => {
    const boundaryWave: WaveDef = {
      ...burstAtZero,
      durationTicks: 200,
      timeoutTicks: 200,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 1 }]
    };
    const boundaryWorkerDefs: readonly BuildingDef[] = messageFestivalV0BuildingDefs.map((def) =>
      def.id === "worker-yard"
        ? {
            ...def,
            stats: {
              ...def.stats,
              processingTicks: 120
            }
          }
        : def
    );
    const started = step(
      createGame(withSingleWave(boundaryWave), 123, {
        buildingDefs: boundaryWorkerDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    const expired = runTicks(started, 120);

    expect(toSnapshot(expired).messages[0]).toMatchObject({
      id: "wave-burst-message-1",
      status: "expired"
    });
    expect(toSnapshot(expired).meters).toMatchObject({
      budget: 50,
      trust: 98,
      backlog: 0
    });
    expect(expired.eventLog.events).not.toContainEqual({
      tick: 120,
      type: "worker.acked",
      messageId: "wave-burst-message-1",
      workerYardId: "worker-yard@slot_worker_1#1"
    });
  });

  it("ends a wave after its spawn window and active backlog are resolved", () => {
    const shortWave: WaveDef = {
      ...burstAtZero,
      durationTicks: 1,
      timeoutTicks: 80
    };
    const started = step(
      createGame(withSingleWave(shortWave), 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    const resolved = runTicks(started, 10);

    expect(toSnapshot(resolved)).toMatchObject({
      phase: "complete",
      activeWaveId: "wave-burst",
      meters: {
        budget: 51,
        backlog: 0,
        trust: 100
      }
    });
    expect(resolved.eventLog.events).toContainEqual({
      tick: 10,
      type: "wave.ended",
      waveId: "wave-burst"
    });
  });

  it("ends a wave at timeout even if active messages remain", () => {
    const timeoutWave: WaveDef = {
      ...burstAtZero,
      durationTicks: 1,
      timeoutTicks: 2,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 1 }]
    };
    const started = step(
      createGame(withSingleWave(timeoutWave), 123, {
        buildingDefs: messageFestivalV0BuildingDefs,
        map: messageFestivalV0Map
      }),
      [{ type: "StartWave", waveId: "wave-burst" }]
    );

    const timedOut = runTicks(started, 2);
    const drained = runTicks(timedOut, 20);

    expect(toSnapshot(timedOut)).toMatchObject({
      phase: "recap",
      activeWaveId: "wave-burst",
      meters: {
        backlog: 1
      }
    });
    expect(toSnapshot(drained)).toMatchObject({
      phase: "complete",
      activeWaveId: "wave-burst",
      meters: {
        backlog: 0
      }
    });
    expect(timedOut.eventLog.events).toContainEqual({
      tick: 2,
      type: "wave.ended",
      waveId: "wave-burst"
    });
  });

  it("does not start another wave during recap while messages are still active", () => {
    const firstWave: WaveDef = {
      ...burstAtZero,
      durationTicks: 1,
      timeoutTicks: 1,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 1 }]
    };
    const secondWave: WaveDef = {
      ...burstAtZero,
      id: "wave-followup",
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 1 }]
    };
    const slowWorkerDefs: readonly BuildingDef[] = messageFestivalV0BuildingDefs.map((def) =>
      def.id === "worker-yard"
        ? {
            ...def,
            stats: {
              ...def.stats,
              processingTicks: 10
            }
          }
        : def
    );
    const timedOut = runTicks(
      step(
        createGame(withWaves([firstWave, secondWave]), 123, {
          buildingDefs: slowWorkerDefs,
          map: messageFestivalV0Map
        }),
        [{ type: "StartWave", waveId: "wave-burst" }]
      ),
      1
    );

    const ignored = step(timedOut, [{ type: "StartWave", waveId: "wave-followup" }]);

    expect(toSnapshot(timedOut)).toMatchObject({
      phase: "recap",
      activeWaveId: "wave-burst"
    });
    expect(toSnapshot(ignored)).toMatchObject({
      phase: "recap",
      activeWaveId: "wave-burst"
    });
    expect(toSnapshot(ignored).messages).toHaveLength(1);
    expect(ignored.eventLog.events).not.toContainEqual({
      tick: timedOut.tick,
      type: "wave.started",
      waveId: "wave-followup"
    });
  });

  it("starts waiting messages during recap after a worker finishes", () => {
    const timeoutWave: WaveDef = {
      ...burstAtZero,
      durationTicks: 1,
      timeoutTicks: 1,
      spawnSchedule: [{ tick: 0, messageType: "useful", count: 2 }]
    };
    const fastWorkerDefs: readonly BuildingDef[] = messageFestivalV0BuildingDefs.map((def) =>
      def.id === "worker-yard"
        ? {
            ...def,
            stats: {
              ...def.stats,
              processingTicks: 2
            }
          }
        : def
    );
    const timedOut = runTicks(
      step(
        createGame(withWaves([timeoutWave, { ...burstAtZero, id: "wave-followup" }]), 123, {
          buildingDefs: fastWorkerDefs,
          map: messageFestivalV0Map
        }),
        [{ type: "StartWave", waveId: "wave-burst" }]
      ),
      1
    );

    const recapProgressed = step(timedOut, []);

    expect(toSnapshot(timedOut).messages.map((message) => message.status)).toEqual([
      "processing",
      "accepted"
    ]);
    expect(toSnapshot(recapProgressed).messages.map((message) => message.status)).toEqual([
      "delivered",
      "processing"
    ]);
    expect(recapProgressed.eventLog.events).toContainEqual({
      tick: timedOut.tick,
      type: "worker.started",
      messageId: "wave-burst-message-2",
      workerYardId: "worker-yard@slot_worker_1#1"
    });
  });
});
