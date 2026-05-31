import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import type { Command } from "@content/schemas";

import {
  advanceRun,
  applyRunCommand,
  createInitialRun,
  getRunControls,
  RUN_TICK_INTERVAL_MS,
  toRunSnapshot,
  type GameRun
} from "./run-controller";

type GameRunAction =
  | { readonly type: "advance"; readonly ticks?: number }
  | { readonly type: "command"; readonly command: Command };

const MAX_RUN_CATCH_UP_TICKS = 10;

export const RUN_SPEED_OPTIONS = [0, 1, 2, 4] as const;

export type RunSpeed = (typeof RUN_SPEED_OPTIONS)[number];

function calculateElapsedIntervalTicks(lastAdvanceTime: number, now: number) {
  return Math.max(1, Math.floor((now - lastAdvanceTime) / RUN_TICK_INTERVAL_MS));
}

export function calculateRunCatchUpTicks(
  lastAdvanceTime: number,
  now: number,
  runSpeed: RunSpeed = 1
) {
  if (runSpeed === 0) {
    return 0;
  }

  return Math.min(
    MAX_RUN_CATCH_UP_TICKS,
    calculateElapsedIntervalTicks(lastAdvanceTime, now) * runSpeed
  );
}

function gameRunReducer(state: GameRun, action: GameRunAction): GameRun {
  switch (action.type) {
    case "advance":
      return advanceRun(state, action.ticks ?? 1);
    case "command":
      return applyRunCommand(state, action.command);
  }
}

export function useGameRun() {
  const [run, dispatch] = useReducer(gameRunReducer, undefined, createInitialRun);
  const [runSpeed, setRunSpeed] = useReducer((_speed: RunSpeed, nextSpeed: RunSpeed) => nextSpeed, 1);
  const lastAdvanceTimeRef = useRef<number | undefined>(undefined);

  const snapshot = useMemo(() => toRunSnapshot(run), [run]);
  const controls = useMemo(() => getRunControls(run.game), [run.game]);
  const sendCommand = useCallback((command: Command) => {
    dispatch({ type: "command", command });
  }, []);

  useEffect(() => {
    if (!controls.isAutoAdvancing || runSpeed === 0) {
      lastAdvanceTimeRef.current = undefined;
      return undefined;
    }

    lastAdvanceTimeRef.current = window.performance.now();
    const intervalId = window.setInterval(() => {
      const now = window.performance.now();
      const lastAdvanceTime = lastAdvanceTimeRef.current ?? now;
      const elapsedIntervalTicks = calculateElapsedIntervalTicks(lastAdvanceTime, now);
      const elapsedTicks = calculateRunCatchUpTicks(lastAdvanceTime, now, runSpeed);

      lastAdvanceTimeRef.current = lastAdvanceTime + elapsedIntervalTicks * RUN_TICK_INTERVAL_MS;
      dispatch({ type: "advance", ticks: elapsedTicks });
    }, RUN_TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [controls.isAutoAdvancing, runSpeed]);

  return { snapshot, controls, runSpeed, sendCommand, setRunSpeed };
}
