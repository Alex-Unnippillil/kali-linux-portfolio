import { Component, ErrorInfo, ReactNode } from 'react';
import { createLogger } from '../../lib/logger';

interface Props {
  children: ReactNode;
  onClose: () => void;
  onRelaunch?: () => void;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class WindowErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    log.error('WindowErrorBoundary caught an error', { error, errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  handleRelaunch = () => {
    this.setState({ hasError: false }, () => {
      if (typeof this.props.onRelaunch === 'function') {
        this.props.onRelaunch();
      }
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center text-sm text-white"
        >
          <div>
            <h2 className="text-lg font-semibold">This window crashed.</h2>
            <p className="mt-1 text-white/80">
              You can close the window or relaunch the app.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.props.onClose}
              className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Close
            </button>
            {this.props.onRelaunch ? (
              <button
                type="button"
                onClick={this.handleRelaunch}
                className="rounded-md border border-white/20 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/30"
              >
                Relaunch
              </button>
            ) : null}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WindowErrorBoundary;
