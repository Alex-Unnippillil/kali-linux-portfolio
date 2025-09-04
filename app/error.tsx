'use client';

import { useEffect } from 'react';

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-4">
      <h2 className="text-xl font-semibold">Something went wrong!</h2>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded bg-slate-100 px-4 py-2 text-sm hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        Reload
      </button>
    </div>
  );
}
