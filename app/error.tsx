'use client';

import { useEffect } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import FadeInOnMount from '../components/common/FadeInOnMount';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    reportClientError(error, error.stack);
  }, [error]);

  return (
    <FadeInOnMount className="flex flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        Try again
      </button>
    </FadeInOnMount>
  );
}
