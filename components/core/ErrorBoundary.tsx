import Link from 'next/link';
import { Component, ErrorInfo, ReactNode } from 'react';
import {
  DEFAULT_LOCALE,
  ErrorCode,
  Locale,
  getLocalizedErrorCopy,
  matchLocale,
} from '../../types/errorCodes';
import { createLogger } from '../../lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  locale: Locale;
}

const log = createLogger();

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, locale: DEFAULT_LOCALE };
  }

  static getDerivedStateFromError(): Pick<State, 'hasError'> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    log.error('ErrorBoundary caught an error', {
      error,
      errorInfo,
      errorCode: ErrorCode.UI_UNEXPECTED,
    });
  }

  componentDidMount(): void {
    if (typeof navigator === 'undefined') return;
    this.setState({ locale: matchLocale(navigator.language) });
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      const localized = getLocalizedErrorCopy(
        ErrorCode.UI_UNEXPECTED,
        this.state.locale
      );
      const bugReportHref = `/input-hub?preset=bug-report&errorCode=${encodeURIComponent(
        localized.code
      )}&title=${encodeURIComponent(localized.summary)}`;
      return (
        <div role="alert" className="p-4 text-center">
          <h1 className="text-xl font-bold">{localized.summary}</h1>
          <p className="mt-2">{localized.remediation}</p>
          <p className="mt-2 text-sm text-gray-500">
            Error code: {localized.code}
          </p>
          <div className="mt-4">
            <Link
              href={bugReportHref}
              className="inline-flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500"
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
