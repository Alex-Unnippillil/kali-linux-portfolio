
'use client';

import { useEffect } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import {
  buildErrorReportUrl,
  ErrorCode,
  getLocalizedErrorEntry,
} from '../types/errorCodes';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, error.stack, ErrorCode.ROUTE_RUNTIME_FAILURE);
  }, [error]);

  const localized = getLocalizedErrorEntry(ErrorCode.ROUTE_RUNTIME_FAILURE);
  const { copy } = localized;
  const reportUrl = buildErrorReportUrl(ErrorCode.ROUTE_RUNTIME_FAILURE);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
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
  );
}
