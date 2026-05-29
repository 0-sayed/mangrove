import { useCallback, useEffect, useRef, useState } from "react";

import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import type { Command } from "@content/schemas";
import { GameCanvas } from "@game/GameCanvas";
import { createGame, step, toSnapshot, type GameState } from "@sim/game";

const TICK_INTERVAL_MS = 50;

function createInitialGameState(): GameState {
  return createGame(messageFestivalV0Level, 12345, {
    buildingDefs: messageFestivalV0BuildingDefs,
    map: messageFestivalV0Map
  });
}

export function App() {
  const [gameState, setGameState] = useState(createInitialGameState);
  const pendingCommandsRef = useRef<Command[]>([]);
  const handleCommand = useCallback((command: Command) => {
    pendingCommandsRef.current = [...pendingCommandsRef.current, command];
  }, []);
  const snapshot = toSnapshot(gameState);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const commands = pendingCommandsRef.current;
      pendingCommandsRef.current = [];

      setGameState((current) => step(current, commands));
    }, TICK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <section className="hud" aria-label="Battlefield HUD">
          <div>
            <p className="eyebrow">Production Town</p>
            <h1>Mangrove</h1>
            <p className="level-label">{messageFestivalV0Level.id}</p>
          </div>
          <div className="meters" aria-label="Core meters">
            <span>Trust {snapshot.meters.trust}</span>
            <span>Budget {snapshot.meters.budget}</span>
            <span>Backlog {snapshot.meters.backlog}</span>
          </div>
        </section>
        <GameCanvas
          level={messageFestivalV0Level}
          map={messageFestivalV0Map}
          buildingDefs={messageFestivalV0BuildingDefs}
          snapshot={snapshot}
          onCommand={handleCommand}
        />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
