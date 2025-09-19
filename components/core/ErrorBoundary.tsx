import {
  Component,
  ErrorInfo,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { createLogger } from '../../lib/logger';
import { reportClientError } from '../../lib/client-error-reporter';
import { buildBugReportURL } from '../../utils/bugReport';

interface FallbackRenderProps {
  errorId: string;
  reset: () => void;
  error?: unknown;
  context?: string;
}

interface Props {
  children: ReactNode;
  fallback?: (props: FallbackRenderProps) => ReactNode;
  onReset?: () => void;
  context?: string;
}

interface State {
  hasError: boolean;
  errorId?: string;
  error?: unknown;
  errorInfo?: ErrorInfo;
}

interface ErrorIdDisplayProps {
  errorId: string;
  className?: string;
  buttonClassName?: string;
  codeClassName?: string;
}

interface DefaultFallbackProps {
  errorId: string;
  onTryAgain: () => void;
  bugReportHref: string;
  context?: string;
}

function copyText(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false);
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve(result);
    } catch {
      return Promise.resolve(false);
    }
  }

  return Promise.resolve(false);
}

const DefaultFallback: React.FC<DefaultFallbackProps> = ({
  errorId,
  onTryAgain,
  bugReportHref,
  context,
}) => {
  const handleReload = useCallback(() => {
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
      window.location.reload();
    }
  }, []);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-ub-cool-grey p-6 text-center text-white">
      <h1 className="text-2xl font-bold">Something went wrong.</h1>
      <p className="max-w-lg text-sm opacity-90">
        We logged the crash to our telemetry. You can try the action again or send the error ID below when
        reporting the issue.
      </p>
      <ErrorIdDisplay errorId={errorId} />
      {context && (
        <p className="text-xs uppercase tracking-wide text-white/70">Context: {context}</p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onTryAgain}
          className="rounded bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={handleReload}
          className="rounded border border-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          Reload page
        </button>
        <a
          href={bugReportHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-white/60 px-4 py-2 text-sm font-medium transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
        >
          Report bug
        </a>
      </div>
    </div>
  );
};

export const ErrorIdDisplay: React.FC<ErrorIdDisplayProps> = ({
  errorId,
  className,
  buttonClassName,
  codeClassName,
}) => {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timeout = setTimeout(() => setStatus('idle'), 2000);
    return () => clearTimeout(timeout);
  }, [status]);

  const handleCopy = useCallback(async () => {
    const ok = await copyText(errorId);
    setStatus(ok ? 'copied' : 'failed');
  }, [errorId]);

  return (
    <div className={className ?? 'flex flex-col items-center gap-2'}>
      <code className={codeClassName ?? 'rounded bg-black/40 px-2 py-1 font-mono text-sm'}>{errorId}</code>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={
            buttonClassName ??
            'rounded bg-white px-3 py-1 text-sm font-medium text-black transition hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60'
          }
        >
          Copy error ID
        </button>
        <span aria-live="polite" className="text-xs">
          {status === 'copied' ? 'Copied!' : status === 'failed' ? 'Copy failed' : ''}
        </span>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  private static generateErrorId(): string {
    if (typeof globalThis === 'object') {
      const cryptoObj = (globalThis as any).crypto;
      if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
      }
    }

    try {
      const { randomUUID } = require('crypto');
      if (typeof randomUUID === 'function') {
        return randomUUID();
      }
    } catch {
      // ignore
    }

    return `err-${Math.random().toString(36).slice(2, 10)}`;
  }

  private static normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error('Unknown error');
    }
  }

  private static serializeError(error: unknown) {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    try {
      return { message: JSON.stringify(error) };
    } catch {
      return { message: 'Non-serializable error' };
    }
  }

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: undefined, errorId: undefined, errorInfo: undefined }, () => {
      if (typeof this.props.onReset === 'function') {
        this.props.onReset();
      }
    });
  };

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    const errorId =
      this.state.hasError && this.state.errorId
        ? this.state.errorId
        : ErrorBoundary.generateErrorId();

    this.setState({ hasError: true, error, errorInfo, errorId });

    const logger = createLogger(errorId);
    logger.error('ErrorBoundary caught an error', {
      error: ErrorBoundary.serializeError(error),
      componentStack: errorInfo?.componentStack,
      context: this.props.context,
    });

    const normalized = ErrorBoundary.normalizeError(error);
    const telemetryError = new Error(`${normalized.message} (errorId: ${errorId})`);
    telemetryError.name = normalized.name;
    telemetryError.stack = normalized.stack;
    void reportClientError(telemetryError, errorInfo?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const errorId = this.state.errorId ?? 'unavailable';
      const context = this.props.context;

      if (this.props.fallback) {
        return this.props.fallback({
          errorId,
          reset: this.resetErrorBoundary,
          error: this.state.error,
          context,
        });
      }

      const bugReportHref = buildBugReportURL({
        errorId,
        context,
        currentUrl:
          typeof window !== 'undefined' && typeof window.location?.href === 'string'
            ? window.location.href
            : undefined,
      });

      return (
        <DefaultFallback
          errorId={errorId}
          onTryAgain={this.resetErrorBoundary}
          bugReportHref={bugReportHref}
          context={context}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
