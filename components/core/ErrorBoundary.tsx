import { Component, ErrorInfo, ReactNode, createRef } from 'react';
import { createLogger } from '../../lib/logger';
import { logEvent } from '../../utils/analytics';

interface Props {
  children: ReactNode;
  logHref?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  private alertRef = createRef<HTMLDivElement>();

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', { error, errorInfo });
    this.focusAlert();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    if (!prevState.hasError && this.state.hasError) {
      this.focusAlert();
    }

    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  private focusAlert() {
    this.alertRef.current?.focus({ preventScroll: true });
  }

  private handleRetry = () => {
    this.setState({ hasError: false }, () => {
      this.props.onRetry?.();
    });
  };

  private handleViewLogs = () => {
    logEvent({
      category: 'error_boundary',
      action: 'view_logs',
      label: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  };

  render() {
    if (this.state.hasError) {
      const logHref = this.props.logHref ?? 'https://unnippillil.com/test-log';

      return (
        <div className="p-4 text-center">
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            An error occurred. Retry the action or view the logs for details.
          </div>
          <div
            role="alert"
            aria-live="polite"
            tabIndex={-1}
            ref={this.alertRef}
            className="mx-auto flex max-w-md flex-col gap-3 rounded-md border border-red-200 bg-red-50 p-6 text-left shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <h1 className="text-xl font-bold text-red-900">Something went wrong.</h1>
            <p className="text-sm text-red-800">
              Try the action again or review the logs for more details.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Retry
              </button>
              <a
                href={logHref}
                target="_blank"
                rel="noreferrer"
                onClick={this.handleViewLogs}
                className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                View logs
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
