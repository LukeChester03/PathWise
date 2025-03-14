import React, { Component, ErrorInfo, ReactNode } from "react";
import MapErrorFallback from "./MapErrorFallback";

interface Props {
  children: ReactNode;
  onRetry: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Map component error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return <MapErrorFallback error={this.state.error} onRetry={this.props.onRetry} />;
    }

    return this.props.children;
  }
}

export default MapErrorBoundary;
