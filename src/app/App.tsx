import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import { Hud } from "@app/Hud";
import { useGameRun } from "@app/useGameRun";
import {
  tdContractFixtureLevel,
  tdContractFixtureMap,
  tdContractFixtureTowerDefs
} from "@content/td-contract-fixture";
import { GameCanvas } from "@game/GameCanvas";

export function App() {
  const { snapshot, controls, sendCommand } = useGameRun();

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <Hud
          snapshot={snapshot}
          controls={controls}
          onCommand={sendCommand}
        />
        <GameCanvas
          level={tdContractFixtureLevel}
          map={tdContractFixtureMap}
          towerDefs={tdContractFixtureTowerDefs}
          snapshot={snapshot}
          onCommand={sendCommand}
        />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
