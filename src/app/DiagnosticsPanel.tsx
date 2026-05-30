import type { SimSnapshot } from "@content/schemas";

interface DiagnosticsPanelProps {
  readonly snapshot: SimSnapshot;
}

export function DiagnosticsPanel({ snapshot }: DiagnosticsPanelProps) {
  if (import.meta.env.VITE_MANGROVE_SHOW_DIAGNOSTICS !== "true") {
    return null;
  }

  return (
    <aside className="diagnostics" aria-label="Development diagnostics">
      <span>tick {snapshot.tick}</span>
      <span>phase {snapshot.phase}</span>
      <span>messages {snapshot.messages.length}</span>
    </aside>
  );
}
