import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  gameName: string;
}

interface State {
  hasError: boolean;
}

/** Catches render/update crashes inside a game shell. */
export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[${this.props.gameName}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
          <p className="text-4xl" aria-hidden>
            🌶️
          </p>
          <h2 className="font-display text-xl font-bold text-orange-300">
            Something went wrong
          </h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {this.props.gameName} hit an unexpected error. Reload to try again.
          </p>
          <Button onClick={() => window.location.reload()} data-ocid="game-error-reload">
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
