import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';
import AlertBanner from '../common/AlertBanner';

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
    log.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <AlertBanner
          tone="danger"
          title="Something went wrong"
          className="flex-col items-center text-center"
        >
          Please refresh the page or try again.
        </AlertBanner>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
