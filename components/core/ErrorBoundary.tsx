import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../../lib/client-error-reporter';
import { createLogger } from '../../lib/logger';
import { captureClientException } from '../../lib/monitoring/sentry';
import { sanitizeErrorForLog, scrubValue } from '../../lib/monitoring/scrub';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const safeInfo = scrubValue({ componentStack: errorInfo.componentStack });

    const normalizedError =
      error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown boundary error');

    captureClientException(normalizedError, {
      componentStack: safeInfo.componentStack,
      boundary: 'components/core/ErrorBoundary',
    });

    void reportClientError(normalizedError, errorInfo.componentStack, { skipCapture: true });

    log.error('ErrorBoundary caught an error', {
      error: sanitizeErrorForLog(normalizedError),
      errorInfo: safeInfo,
    });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="p-4 text-center">
          <h1 className="text-xl font-bold">Something went wrong.</h1>
          <p>Please refresh the page or try again.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
