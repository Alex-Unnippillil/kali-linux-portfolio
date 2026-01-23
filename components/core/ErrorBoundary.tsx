import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ub-cool-grey px-6 py-4 text-center text-white"
        >
          <div>
            <h1 className="text-lg font-semibold">Something went wrong.</h1>
            <p className="mt-1 text-sm text-white/80">
              Please try again or reload the desktop.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleRetry}
              className="rounded border border-white/60 px-3 py-1 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-gedit-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded border border-white/60 px-3 py-1 text-sm font-medium text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ubt-gedit-blue focus-visible:ring-offset-2 focus-visible:ring-offset-ub-cool-grey"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
