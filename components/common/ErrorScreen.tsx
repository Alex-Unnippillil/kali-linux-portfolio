import Link from 'next/link';
import { ReactNode } from 'react';

export interface ErrorScreenProps {
  title?: string;
  message?: string | ReactNode;
  code?: string;
  onRetry?: () => void;
  retryLabel?: string;
  logHref?: string;
  logLabel?: string;
  className?: string;
  layout?: 'full' | 'compact';
}

const baseContainerClasses =
  'flex h-full w-full flex-col items-center justify-center bg-slate-950/95 text-slate-100';
const fullLayoutClasses = 'gap-6 px-6 py-10 text-center';
const compactLayoutClasses = 'gap-4 px-4 py-6 text-center text-sm';

const ErrorScreen = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. You can retry or review the logs for more details.',
  code,
  onRetry,
  retryLabel = 'Retry',
  logHref = '/docs/troubleshooting',
  logLabel = 'View troubleshooting guide',
  className = '',
  layout = 'full',
}: ErrorScreenProps) => {
  const containerClasses = `${baseContainerClasses} ${
    layout === 'compact' ? compactLayoutClasses : fullLayoutClasses
  } ${className}`;

  const formattedCode = code?.trim();

  return (
    <section role="alert" aria-live="assertive" className={containerClasses}>
      <div className="max-w-2xl space-y-3">
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
        {typeof message === 'string' ? (
          <p className="text-base text-slate-300 sm:text-lg">{message}</p>
        ) : (
          message
        )}
      </div>

      {formattedCode && (
        <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-slate-800 bg-black/70 shadow-inner">
          <pre className="max-h-96 overflow-auto p-4 text-left text-xs leading-relaxed text-emerald-200 md:text-sm">
            <code>{formattedCode}</code>
          </pre>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-emerald-500 px-5 py-2 text-sm font-medium text-white shadow hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            {retryLabel}
          </button>
        )}
        {logHref && (
          <Link
            href={logHref}
            className="rounded-md border border-slate-600 px-5 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            {logLabel}
          </Link>
        )}
      </div>
    </section>
  );
};

export default ErrorScreen;
