import { Component, ErrorInfo, ReactNode } from 'react';
import Link from 'next/link';
import { reportClientError } from '../../lib/client-error-reporter';

interface Props {
  children: ReactNode;
  /**
   * Custom fallback. When provided as a function it receives the error and a
   * reset callback to recover from the error state.
   */
  fallback?:
    | ReactNode
    | ((error: Error, reset: () => void) => ReactNode);
}

interface State {
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportClientError(error, errorInfo.componentStack).catch((err) => {
      console.error('Failed to report client error', err);
    });
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (error) {
      if (typeof fallback === 'function') {
        return fallback(error, this.reset);
      }

      if (fallback) {
        return fallback;
      }

      return (
        <div role="alert" className="p-4 text-center">
          <h1 className="text-xl font-bold">Something went wrong.</h1>
          <p className="mb-4">You can try again or report the issue.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Try again
            </button>
            <Link
              href="/apps/contact"
              className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              Report issue
            </Link>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
