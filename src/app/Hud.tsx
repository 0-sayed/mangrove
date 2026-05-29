import type { Command, SimSnapshot } from "@content/schemas";

import {
  createIncreaseWorkerCountCommand,
  createPlaceQueueHubCommand,
  createStartNextWaveCommand,
  type RunControls
} from "./run-controller";

interface HudProps {
  readonly snapshot: SimSnapshot;
  readonly controls: RunControls;
  readonly onCommand: (command: Command) => void;
}

interface MeterProps {
  readonly label: string;
  readonly value: number;
  readonly tone: "trust" | "budget" | "backlog";
}

function Meter({ label, value, tone }: MeterProps) {
  return (
    <span className={`meter meter--${tone}`} aria-label={label}>
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

export function Hud({ snapshot, controls, onCommand }: HudProps) {
  return (
    <section className="hud" aria-label="Battlefield HUD">
      <div className="hud__identity">
        <p className="eyebrow">Production Town</p>
        <h1>Mangrove</h1>
        <p className="level-label">message-festival-v0</p>
      </div>

      <div className="hud__status" aria-label="Run status">
        <span aria-label="Run phase">{controls.phaseLabel}</span>
        <span aria-label="Active wave">{controls.activeWaveLabel}</span>
        <span aria-label="Simulation tick" data-testid="sim-tick">
          {snapshot.tick}
        </span>
      </div>

      <div className="meters" aria-label="Core meters">
        <Meter label="Trust" value={snapshot.meters.trust} tone="trust" />
        <Meter label="Budget" value={snapshot.meters.budget} tone="budget" />
        <Meter label="Backlog" value={snapshot.meters.backlog} tone="backlog" />
      </div>

      <div className="hud__controls" aria-label="Run controls">
        <button
          type="button"
          disabled={!controls.canStartNextWave}
          onClick={() => {
            onCommand(createStartNextWaveCommand(controls));
          }}
        >
          Start {controls.nextWaveLabel}
        </button>
        <button
          type="button"
          disabled={!controls.canPlaceQueueHub}
          onClick={() => {
            onCommand(createPlaceQueueHubCommand());
          }}
        >
          Build Queue Hub ({controls.queueHubCost})
        </button>
        <button
          type="button"
          disabled={!controls.canIncreaseWorkerCount}
          onClick={() => {
            onCommand(createIncreaseWorkerCountCommand());
          }}
        >
          Workers {controls.workerCount}/{controls.maxWorkerCount} (+
          {controls.workerCountUpgradeCost})
        </button>
      </div>
    </section>
  );
}
