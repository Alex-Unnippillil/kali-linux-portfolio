import React from 'react';

interface GameErrorBoundaryState {
  hasError: boolean;
}

class GameErrorBoundary extends React.Component<React.PropsWithChildren<{}>, GameErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Error in game component:', error, errorInfo);
  }

  handleReload() {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
          <p className="mb-4">Something went wrong.</p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default GameErrorBoundary;

export const withGameErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  const Wrapped = (props: P) => (
    <GameErrorBoundary>
      <Component {...props} />
    </GameErrorBoundary>
  );
  return Wrapped;
};
