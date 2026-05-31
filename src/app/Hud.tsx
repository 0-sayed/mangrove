import type { CSSProperties } from "react";

import type { Command, SimSnapshot } from "@content/schemas";
import { atlasCssFrame } from "@game/gameplay-assets";

import {
  createBuildWorkerTowerCommand,
  createStartNextWaveCommand,
  type RunControls
} from "./run-controller";
import { RUN_SPEED_OPTIONS, type RunSpeed } from "./useGameRun";

interface HudProps {
  readonly snapshot: SimSnapshot;
  readonly controls: RunControls;
  readonly runSpeed: RunSpeed;
  readonly onCommand: (command: Command) => void;
  readonly onRunSpeedChange: (runSpeed: RunSpeed) => void;
}

type MeterTone = "town-health" | "build-budget" | "pressure";

interface MeterProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: number;
  readonly tone: MeterTone;
}

interface HudIconProps {
  readonly tone: MeterTone;
}

function HudIcon({ tone }: HudIconProps) {
  const frame = atlasCssFrame(`ui-icon-${tone}`);
  const style: CSSProperties & {
    "--hud-icon-image": string;
    "--hud-icon-position": string;
    "--hud-icon-size": string;
  } = {
    "--hud-icon-image": `url(${frame.imageUrl})`,
    "--hud-icon-position": frame.backgroundPosition,
    "--hud-icon-size": frame.backgroundSize
  };

  return <span aria-hidden="true" className={`hud-icon hud-icon--${tone}`} style={style} />;
}

function Meter({ label, tooltip, value, tone }: MeterProps) {
  return (
    <span className={`meter meter--${tone}`} aria-label={label} data-tooltip={tooltip}>
      <HudIcon tone={tone} />
      <strong>{value}</strong>
      <span>{label}</span>
    </span>
  );
}

export function Hud({ snapshot, controls, runSpeed, onCommand, onRunSpeedChange }: HudProps) {
  const startWaveButtonLabel = controls.canStartNextWave
    ? `Start ${controls.nextWaveLabel}`
    : controls.isAutoAdvancing
      ? `${controls.activeWaveLabel} Running`
      : "No Wave Available";

  return (
    <section className="hud" aria-label="Battlefield HUD">
      <div className="hud__status" aria-label="Run status">
        <span aria-label="Run phase" data-tooltip="Current run step.">
          {controls.phaseLabel}
        </span>
        <span aria-label="Active wave" data-tooltip="The current traffic wave.">
          {controls.activeWaveLabel}
        </span>
        <span className="sr-only" aria-label="Simulation tick" data-testid="sim-tick">
          {snapshot.tick}
        </span>
      </div>

      <div className="meters" aria-label="Core meters">
        <Meter
          label="Town Health"
          tooltip={METER_TOOLTIPS["town-health"]}
          value={snapshot.meters.townHealth}
          tone="town-health"
        />
        <Meter
          label="Build Budget"
          tooltip={METER_TOOLTIPS["build-budget"]}
          value={snapshot.meters.buildBudget}
          tone="build-budget"
        />
        <Meter
          label="Pressure"
          tooltip={METER_TOOLTIPS.pressure}
          value={snapshot.meters.pressure}
          tone="pressure"
        />
      </div>

      <div className="hud__controls" aria-label="Run controls">
        <div className="speed-control" role="group" aria-label="Game speed">
          {RUN_SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              aria-pressed={runSpeed === speed}
              onClick={() => {
                onRunSpeedChange(speed);
              }}
            >
              {speed === 0 ? "Pause" : `${String(speed)}x`}
            </button>
          ))}
        </div>
        <span
          className="tooltip-anchor"
          data-tooltip="Start the next traffic wave when defenses are ready."
        >
          <button
            type="button"
            disabled={!controls.canStartNextWave}
            onClick={() => {
              onCommand(createStartNextWaveCommand(controls));
            }}
          >
            {startWaveButtonLabel}
          </button>
        </span>
        <span
          className="tooltip-anchor"
          data-tooltip="Place a worker tower on the first available worker pad."
        >
          <button
            type="button"
            disabled={!controls.canBuildWorkerTower}
            onClick={() => {
              onCommand(createBuildWorkerTowerCommand());
            }}
          >
            {`Build Worker Tower (${String(controls.workerTowerCost)})`}
          </button>
        </span>
      </div>
    </section>
  );
}

const METER_TOOLTIPS: Readonly<Record<MeterTone, string>> = {
  "town-health": "Town durability. Falls when traffic leaks through defenses.",
  "build-budget": "Build currency. Earned from waves and spent on towers.",
  pressure: "Incoming traffic pressure from the current wave."
};
