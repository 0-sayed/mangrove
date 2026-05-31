import type { CSSProperties } from "react";

import type { Command, SimSnapshot } from "@content/schemas";
import { atlasCssFrame } from "@game/gameplay-assets";

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
  readonly tooltip: string;
  readonly value: number;
  readonly tone: "trust" | "budget" | "backlog";
}

interface HudIconProps {
  readonly tone: MeterProps["tone"];
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

export function Hud({ snapshot, controls, onCommand }: HudProps) {
  return (
    <section className="hud" aria-label="Battlefield HUD">
      <div className="hud__status" aria-label="Run status">
        <span
          aria-label="Run phase"
          data-tooltip="Current run step: prepare, wave, build phase, or complete."
        >
          {controls.phaseLabel}
        </span>
        <span
          aria-label="Active wave"
          data-tooltip="The current incident wave. Build choices should answer this pressure."
        >
          {controls.activeWaveLabel}
        </span>
        <span className="sr-only" aria-label="Simulation tick" data-testid="sim-tick">
          {snapshot.tick}
        </span>
      </div>

      <div className="meters" aria-label="Core meters">
        <Meter
          label="Trust"
          tooltip={METER_TOOLTIPS.trust}
          value={snapshot.meters.trust}
          tone="trust"
        />
        <Meter
          label="Budget"
          tooltip={METER_TOOLTIPS.budget}
          value={snapshot.meters.budget}
          tone="budget"
        />
        <Meter
          label="Backlog"
          tooltip={METER_TOOLTIPS.backlog}
          value={snapshot.meters.backlog}
          tone="backlog"
        />
      </div>

      <div className="hud__controls" aria-label="Run controls">
        <span
          className="tooltip-anchor"
          data-tooltip="Start the next incident wave when your defenses are ready."
        >
          <button
            type="button"
            disabled={!controls.canStartNextWave}
            onClick={() => {
              onCommand(createStartNextWaveCommand(controls));
            }}
          >
            Start {controls.nextWaveLabel}
          </button>
        </span>
        <span
          className="tooltip-anchor"
          data-tooltip="Build a buffer defense that absorbs burst pressure before processors take over."
        >
          <button
            type="button"
            disabled={!controls.canPlaceQueueHub}
            onClick={() => {
              onCommand(createPlaceQueueHubCommand());
            }}
          >
            Build Queue Hub ({controls.queueHubCost})
          </button>
        </span>
        <span
          className="tooltip-anchor"
          data-tooltip="Tune a processor defense so waiting work drains faster after a burst."
        >
          <button
            type="button"
            disabled={!controls.canIncreaseWorkerCount}
            onClick={() => {
              onCommand(createIncreaseWorkerCountCommand(controls.workerCount));
            }}
          >
            Workers {controls.workerCount}/{controls.maxWorkerCount} (+
            {controls.workerCountUpgradeCost})
          </button>
        </span>
      </div>
    </section>
  );
}

const METER_TOOLTIPS: Readonly<Record<MeterProps["tone"], string>> = {
  trust: "Town health. Falls when useful work leaks or expires.",
  budget: "Build currency. Earned from deliveries, spent on defenses and upgrades.",
  backlog: "Pressure meter. Work waiting or in progress; not spendable."
};
