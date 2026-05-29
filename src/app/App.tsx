import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import {
  messageFestivalV0BuildingDefs,
  messageFestivalV0Level,
  messageFestivalV0Map
} from "@content/message-festival-v0";
import { GameCanvas } from "@game/GameCanvas";
import { createGame, step, toSnapshot } from "@sim/game";

function createBattlefieldPreview() {
  const initial = createGame(messageFestivalV0Level, 12345, {
    buildingDefs: messageFestivalV0BuildingDefs,
    map: messageFestivalV0Map
  });

  return toSnapshot(step(initial, [{ type: "StartWave", waveId: "wave-opening-flow" }]));
}

export function App() {
  const snapshot = createBattlefieldPreview();

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
        />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
