'use client';

import { useEffect } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import {
  buildErrorReportUrl,
  ErrorCode,
  getLocalizedErrorEntry,
} from '../types/errorCodes';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, error.stack, ErrorCode.GLOBAL_APP_CRASH);
  }, [error]);

  const localized = getLocalizedErrorEntry(ErrorCode.GLOBAL_APP_CRASH);
  const { copy } = localized;
  const reportUrl = buildErrorReportUrl(ErrorCode.GLOBAL_APP_CRASH);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
          <h2 className="text-xl font-semibold">{copy.title}</h2>
          <p className="text-center text-base">{copy.description}</p>
          <p className="text-center text-sm italic">{copy.remediation}</p>
          <p className="text-xs text-slate-500">
            Error code: <span className="font-mono">{localized.code}</span>
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Try again
          </button>
          <a
            href={reportUrl}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Report this issue
          </a>
        </div>
      </body>
    </html>
  );
}
