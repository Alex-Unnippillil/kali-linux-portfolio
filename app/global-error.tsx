'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import {
  getLatestPaneSnapshot,
  queuePaneSnapshotRestore,
  hasPaneSnapshot,
} from '../utils/windowLayout';

interface GlobalErrorProps {
  error: Error;
  reset: () => void;
}

const baseButtonClasses =
  'rounded bg-slate-100 px-4 py-2 text-sm font-medium transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700';

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [snapshotMeta, setSnapshotMeta] = useState(() => getLatestPaneSnapshot());

  useEffect(() => {
    reportClientError(error, error.stack);
    setSnapshotMeta(getLatestPaneSnapshot());
  }, [error]);

  const hasSnapshotAvailable = useMemo(() => {
    if (snapshotMeta) return true;
    return hasPaneSnapshot(snapshotMeta?.paneId);
  }, [snapshotMeta]);

  const lastSavedLabel = useMemo(() => {
    if (!snapshotMeta?.updatedAt) return null;
    try {
      return new Date(snapshotMeta.updatedAt).toLocaleString();
    } catch {
      return null;
    }
  }, [snapshotMeta]);

  const handleReload = useCallback(() => {
    reset();
  }, [reset]);

  const handleRestore = useCallback(() => {
    const latest = getLatestPaneSnapshot() ?? snapshotMeta;
    if (!latest?.paneId) {
      reset();
      return;
    }
    const prepared = queuePaneSnapshotRestore(latest.paneId);
    if (!prepared) {
      reset();
      return;
    }
    setSnapshotMeta(null);
    reset();
  }, [reset, snapshotMeta]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h2 className="text-xl font-semibold">Critical desktop error</h2>
          <p className="max-w-xl text-sm text-slate-600 dark:text-slate-300">
            The entire workspace failed to recover. Reloading the desktop will restart every pane. If you were editing in a
            single window, you can try restoring its last snapshot first and then reload the workspace.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={handleReload} className={baseButtonClasses}>
              Reload desktop
            </button>
            <button
              type="button"
              onClick={handleRestore}
              disabled={!hasSnapshotAvailable}
              className={`${baseButtonClasses} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600 disabled:text-white/70 dark:bg-blue-500 dark:hover:bg-blue-400`}
            >
              Restore snapshot &amp; reload
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hasSnapshotAvailable
              ? lastSavedLabel
                ? `Snapshot saved ${lastSavedLabel}.`
                : 'Snapshot ready to restore.'
              : 'Add usePaneSnapshot to panes to capture recoverable form inputs.'}
          </p>
        </div>
      </body>
    </html>
  );
}
