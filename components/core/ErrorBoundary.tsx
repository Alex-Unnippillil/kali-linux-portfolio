import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '@/lib/logger';

const log = createLogger();

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    // You can log the error to an error reporting service
    log.error('ErrorBoundary caught an error', {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      errorInfo,
    });
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
