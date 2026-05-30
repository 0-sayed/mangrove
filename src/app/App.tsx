import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import { Hud } from "@app/Hud";
import { useGameRun } from "@app/useGameRun";
import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import { GameCanvas } from "@game/GameCanvas";

export function App() {
  const { snapshot, controls, sendCommand } = useGameRun();

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <Hud
          levelId={messageFestivalV0Level.id}
          snapshot={snapshot}
          controls={controls}
          onCommand={sendCommand}
        />
        <GameCanvas
          level={messageFestivalV0Level}
          map={messageFestivalV0Map}
          buildingDefs={messageFestivalV0BuildingDefs}
          snapshot={snapshot}
        />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
