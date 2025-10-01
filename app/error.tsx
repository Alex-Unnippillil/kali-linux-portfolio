
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { reportClientError } from '../lib/client-error-reporter';
import {
  getLatestPaneSnapshot,
  queuePaneSnapshotRestore,
  hasPaneSnapshot,
} from '../utils/windowLayout';

interface PaneErrorProps {
  error: Error;
  reset: () => void;
}

const baseButtonClasses =
  'rounded bg-slate-100 px-4 py-2 text-sm font-medium transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-800 dark:hover:bg-slate-700';

export default function Error({ error, reset }: PaneErrorProps) {
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
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-xl font-semibold">This pane crashed</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-300">
        The desktop window hit an unexpected error. You can reload the pane to try again, or
        restore the last captured inputs if you were in the middle of editing.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" onClick={handleReload} className={baseButtonClasses}>
          Reload pane
        </button>
        <button
          type="button"
          onClick={handleRestore}
          disabled={!hasSnapshotAvailable}
          className={`${baseButtonClasses} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-600 disabled:text-white/70 dark:bg-blue-500 dark:hover:bg-blue-400`}
        >
          Restore snapshot
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {hasSnapshotAvailable
          ? lastSavedLabel
            ? `Snapshot saved ${lastSavedLabel}.`
            : 'Snapshot ready to restore.'
          : 'Snapshots capture form inputs before render; add usePaneSnapshot to opt in.'}
      </p>
    </div>
  );
}
