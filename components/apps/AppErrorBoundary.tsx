import { Component, ErrorInfo, ReactNode } from 'react';
import ErrorScreen from '../common/ErrorScreen';
import { createLogger } from '../../lib/logger';

interface AppErrorBoundaryProps {
  appId: string;
  appTitle?: string;
  children: ReactNode;
  onRetry?: () => void;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error?: Error | null;
  componentStack?: string;
}

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  private logger = createLogger();

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ componentStack: errorInfo?.componentStack });
    this.logger.error('App boundary caught an error', {
      appId: this.props.appId,
      error,
      componentStack: errorInfo?.componentStack,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, componentStack: undefined }, () => {
      if (typeof this.props.onRetry === 'function') {
        this.props.onRetry();
      }
    });
  };

  render() {
    if (this.state.hasError) {
      const { appId, appTitle } = this.props;
      const code = [
        this.state.error?.message,
        this.state.error?.stack,
        this.state.componentStack,
      ]
        .filter(Boolean)
        .join('\n\n');

      return (
        <ErrorScreen
          title={`${appTitle ?? 'App'} crashed`}
          message={`The ${appTitle ?? appId} module reported an unexpected error. Try again or review the logs for more context.`}
          code={code}
          onRetry={this.handleRetry}
          layout="compact"
        />
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
