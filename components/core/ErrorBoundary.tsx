import Link from 'next/link';
import { Component, ErrorInfo, ReactNode } from 'react';
import { reportClientError } from '../../lib/client-error-reporter';
import { createLogger } from '../../lib/logger';
import {
  buildErrorReportUrl,
  ErrorCode,
  getLocalizedErrorEntry,
} from '../../types/errorCodes';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  private readonly errorCode = ErrorCode.LEGACY_PAGE_CRASH;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', {
      error,
      errorInfo,
      errorCode: this.errorCode,
    });
    reportClientError(error, errorInfo.componentStack, this.errorCode).catch(() => {
      // intentionally ignore network failures when reporting
    });
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const localized = getLocalizedErrorEntry(this.errorCode);
      const { copy } = localized;
      const reportUrl = buildErrorReportUrl(this.errorCode);

      return (
        <div role="alert" className="p-4 text-center">
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="mt-2">{copy.description}</p>
          <p className="mt-4 italic">{copy.remediation}</p>
          <p className="mt-4 text-sm text-gray-500">
            Error code: <span className="font-mono">{localized.code}</span>
          </p>
          <div className="mt-4 flex flex-col items-center gap-2 md:flex-row md:justify-center">
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded bg-slate-200 px-3 py-1 text-sm font-medium text-slate-900 hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
            >
              Refresh page
            </button>
            <Link
              href={reportUrl}
              className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
            >
              Report this issue
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
