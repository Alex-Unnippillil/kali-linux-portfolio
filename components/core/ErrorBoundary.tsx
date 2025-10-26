import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';
import { logCrash } from '../../utils/crashLog';

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
    logCrash({ error, info: errorInfo });
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
