'use client';

import { useEffect } from 'react';
import { reportClientError } from '../lib/client-error-reporter';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error, error.stack);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
          <h2 className="text-xl font-semibold">Something went wrong!</h2>
          <button type="button" onClick={() => reset()} className="btn btn--primary">
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
