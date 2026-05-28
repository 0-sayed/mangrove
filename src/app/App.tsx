import { DiagnosticsPanel } from "@app/DiagnosticsPanel";
import { ErrorBoundary } from "@app/ErrorBoundary";
import { bootstrapLevel } from "@content/bootstrap-level";
import { GameCanvas } from "@game/GameCanvas";
import { createBootstrapSnapshot } from "@sim/bootstrap-state";

export function App() {
  const snapshot = createBootstrapSnapshot();

  return (
    <ErrorBoundary>
      <main className="app-shell">
        <section className="hud" aria-label="Bootstrap HUD">
          <div>
            <p className="eyebrow">Production Town</p>
            <h1>Mangrove</h1>
            <p className="level-label">{bootstrapLevel.mapId}</p>
          </div>
          <div className="meters" aria-label="Core meters">
            <span>Trust {snapshot.meters.trust}</span>
            <span>Budget {snapshot.meters.budget}</span>
            <span>Backlog {snapshot.meters.backlog}</span>
          </div>
        </section>
        <GameCanvas />
        <DiagnosticsPanel snapshot={snapshot} />
      </main>
    </ErrorBoundary>
  );
}
