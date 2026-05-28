import type { BootstrapSnapshot } from "@sim/bootstrap-state";

interface DiagnosticsPanelProps {
  readonly snapshot: BootstrapSnapshot;
}

export function DiagnosticsPanel({ snapshot }: DiagnosticsPanelProps) {
  if (import.meta.env.VITE_MANGROVE_SHOW_DIAGNOSTICS !== "true" && !import.meta.env.DEV) {
    return null;
  }

  return (
    <aside className="diagnostics" aria-label="Development diagnostics">
      <span>tick {snapshot.tick}</span>
      <span>phase {snapshot.phase}</span>
      <span>events {snapshot.recentEvents.length}</span>
    </aside>
  );
}
