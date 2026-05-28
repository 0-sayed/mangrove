import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    error: null
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App shell crashed.", error, info);
  }

  public override render(): ReactNode {
    if (this.state.error) {
      return (
        <main className="app-shell app-shell--error">
          <h1>Mangrove</h1>
          <p>Bootstrap shell failed to render.</p>
        </main>
      );
    }

    return this.props.children;
  }
}
