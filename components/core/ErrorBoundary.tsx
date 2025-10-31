import { Component, ErrorInfo, ReactNode } from 'react';
import { trackEvent } from '../../lib/analytics-client';
import { createLogger } from '../../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: unknown;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', { error, errorInfo });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  private handleRetry = (): void => {
    if (typeof window === 'undefined') return;
    window.location.reload();
  };

  private handleOpenCached = (): void => {
    if (typeof window === 'undefined') return;

    const payload = { source: 'error-boundary', path: '/offline.html', ts: Date.now() };

    try {
      window.localStorage?.setItem('offlineFallbackUsed', JSON.stringify(payload));
    } catch (storageError) {
      log.warn('Unable to persist offline fallback usage', { storageError });
    }

    trackEvent('offline_fallback_used', { source: 'error-boundary', path: payload.path });
    if (typeof window !== 'undefined' && 'CustomEvent' in window) {
      window.dispatchEvent(new CustomEvent('offline:fallback-open', { detail: payload }));
    }
    window.location.href = '/offline.html';
  };

  private isNetworkError(error: unknown): boolean {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return true;
    }

    if (!error) return false;

    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    return (
      normalized.includes('failed to fetch') ||
      normalized.includes('networkerror') ||
      normalized.includes('load failed') ||
      normalized.includes('network request failed')
    );
  }

  render() {
    const { hasError, error } = this.state;

    if (hasError) {
      const networkError = this.isNetworkError(error);

      return (
        <div role="alert" className="p-4 text-center">
          <h1 className="text-xl font-bold">Something went wrong.</h1>
          <p>
            {networkError
              ? 'We could not reach the network. You can retry the request or open cached content.'
              : 'Please refresh the page or try again.'}
          </p>
          {networkError && (
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded bg-kali-primary px-4 py-2 font-semibold text-kali-inverse shadow hover:bg-kali-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={this.handleOpenCached}
                className="rounded border border-kali-primary px-4 py-2 font-semibold text-kali-primary hover:bg-kali-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus"
              >
                Open cached
              </button>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
