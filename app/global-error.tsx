'use client';

import { useEffect, useMemo } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import { classifyError, getErrorPresentation } from '../lib/error-taxonomy';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const classification = useMemo(() => classifyError(error), [error]);
  const presentation = useMemo(() => getErrorPresentation(classification), [classification]);

  useEffect(() => {
    reportClientError(classification.error, {
      componentStack: error.stack,
      category: classification.category,
      diagnostics: classification.diagnostics,
      retryable: classification.retryable,
    });
  }, [classification, error.stack]);

  const handlePrimaryAction = () => {
    reset();
  };

  const handleSecondaryAction = () => {
    if (presentation.secondaryActionHref) {
      window.open(presentation.secondaryActionHref, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center" role="alert" aria-live="assertive">
          <h2 className="text-xl font-semibold">{presentation.title}</h2>
          <p className="max-w-lg text-sm text-slate-600 dark:text-slate-300">{presentation.message}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handlePrimaryAction}
              className="rounded bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              {presentation.primaryActionLabel}
            </button>
            {presentation.secondaryActionLabel ? (
              <button
                type="button"
                onClick={handleSecondaryAction}
                className="rounded border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                {presentation.secondaryActionLabel}
              </button>
            ) : null}
          </div>
          {process.env.NODE_ENV === 'development' ? (
            <details className="max-w-lg text-left">
              <summary className="cursor-pointer text-xs uppercase text-slate-400">Debug details</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500 dark:text-slate-400">
                {classification.error.message}
              </pre>
            </details>
          ) : null}
        </div>
      </body>
    </html>
  );
}
