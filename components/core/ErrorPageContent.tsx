'use client';

import { useEffect, useId, useState } from 'react';
import clsx from 'clsx';
import Toast from '../ui/Toast';
import { reportClientError } from '../../lib/client-error-reporter';

interface ErrorPageContentProps {
  error: Error;
  reset: () => void;
  correlationId: string | null;
  bugReportUrl?: string;
  isLoading?: boolean;
  loadError?: boolean;
  fullScreen?: boolean;
}

export function ErrorPageContent({
  error,
  reset,
  correlationId,
  bugReportUrl,
  isLoading = false,
  loadError = false,
  fullScreen = false,
}: ErrorPageContentProps) {
  const [toastMessage, setToastMessage] = useState('');
  const instructionsId = useId();

  useEffect(() => {
    if (!correlationId) {
      return;
    }

    reportClientError(error, error.stack, correlationId);
  }, [correlationId, error]);

  const handleCopy = async () => {
    if (!correlationId) {
      setToastMessage(loadError ? 'Correlation ID is unavailable.' : 'Correlation ID is still loading.');
      return;
    }

    if (!navigator.clipboard) {
      setToastMessage('Clipboard API is unavailable. Please copy the ID manually.');
      return;
    }

    try {
      await navigator.clipboard.writeText(correlationId);
      setToastMessage('Correlation ID copied to clipboard.');
    } catch (copyError) {
      console.error('Failed to copy correlation ID', copyError);
      setToastMessage('Failed to copy the ID. Please try again.');
    }
  };

  return (
    <div
      className={clsx(
        'flex w-full flex-col items-center justify-center gap-4 p-4 text-center',
        fullScreen ? 'min-h-screen' : undefined,
      )}
    >
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <p className="max-w-prose text-sm text-slate-600 dark:text-slate-300">
        An unexpected error occurred. You can try again, or share the correlation ID below if you need help debugging.
      </p>
      <div className="flex flex-col items-center gap-2" aria-live="polite">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          Correlation ID:{' '}
          {isLoading && (
            <span className="text-xs font-normal text-slate-500">Loading…</span>
          )}
          {loadError && !isLoading && (
            <span className="text-xs font-normal text-red-600 dark:text-red-300">Unavailable</span>
          )}
          {correlationId && !isLoading && !loadError && (
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-800">{correlationId}</code>
          )}
        </p>
        <p id={instructionsId} className="sr-only">
          Activate the copy button to copy the correlation ID to your clipboard.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            aria-describedby={instructionsId}
            className={clsx(
              'rounded px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring focus-visible:ring-slate-400',
              correlationId && !isLoading && !loadError
                ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
            )}
          >
            Copy error ID
          </button>
          <a
            href={bugReportUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-disabled={!bugReportUrl}
            tabIndex={bugReportUrl ? undefined : -1}
            className={clsx(
              'rounded border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring focus-visible:ring-slate-400',
              bugReportUrl
                ? 'border-slate-300 text-slate-900 hover:border-slate-400 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800'
                : 'cursor-not-allowed border-slate-200 text-slate-400 dark:border-slate-700 dark:text-slate-500',
            )}
          >
            Report this issue
          </a>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring focus-visible:ring-slate-400 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Try again
          </button>
        </div>
      </div>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage('')} />}
    </div>
  );
}

export default ErrorPageContent;
