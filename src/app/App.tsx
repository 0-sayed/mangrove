import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import { Hud } from "@app/Hud";
import { useGameRun } from "@app/useGameRun";
import {
  trafficSurgeLevel,
  trafficSurgeMap,
  trafficSurgeTowerDefs
} from "@content/traffic-surge-level";
import { GameCanvas } from "@game/GameCanvas";

export function App() {
  const { snapshot, controls, runSpeed, sendCommand, setRunSpeed } = useGameRun();

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <Hud
          snapshot={snapshot}
          controls={controls}
          runSpeed={runSpeed}
          onCommand={sendCommand}
          onRunSpeedChange={setRunSpeed}
        />
        <GameCanvas
          level={trafficSurgeLevel}
          map={trafficSurgeMap}
          towerDefs={trafficSurgeTowerDefs}
          snapshot={snapshot}
          onCommand={sendCommand}
        />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
