import { Component, ErrorInfo, ReactNode } from 'react';
import type { ContextType } from 'react';
import { createLogger } from '../../lib/logger';
import { BugReportContext } from '../common/BugReportProvider';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  static contextType = BugReportContext;
  declare context: ContextType<typeof BugReportContext>;
  private lastError: unknown;
  private lastErrorInfo: ErrorInfo | null = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    this.lastError = error;
    this.lastErrorInfo = errorInfo;
    log.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  private handleReport = () => {
    if (!this.context) return;
    const { open } = this.context;
    if (typeof open === 'function') {
      open({
        source: 'error-boundary',
        error: this.lastError,
        errorInfo: this.lastErrorInfo,
        note: 'Triggered from global error boundary',
      });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-6 text-center">
          <h1 className="text-xl font-bold">Something went wrong.</h1>
          <p className="mt-2">Please refresh the page or try again.</p>
          <button
            type="button"
            onClick={this.handleReport}
            className="mt-4 rounded bg-ubt-ubuntu px-4 py-2 text-sm font-semibold text-white transition hover:bg-ubt-ubuntu/80"
          >
            Report this issue
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
