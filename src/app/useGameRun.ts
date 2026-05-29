import { useCallback, useEffect, useMemo, useReducer } from "react";

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

  const snapshot = useMemo(() => toRunSnapshot(run), [run]);
  const controls = useMemo(() => getRunControls(run.game), [run.game]);
  const sendCommand = useCallback((command: Command) => {
    dispatch({ type: "command", command });
  }, []);

  useEffect(() => {
    if (!controls.isAutoAdvancing) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      dispatch({ type: "advance" });
    }, RUN_TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [controls.isAutoAdvancing]);

  return { snapshot, controls, sendCommand };
}
