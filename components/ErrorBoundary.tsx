import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="p-4 text-center">
          <p>Something went wrong.</p>
          <button onClick={this.handleRetry} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded">
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
