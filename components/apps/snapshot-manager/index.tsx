'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  type SnapshotRecord,
  type RollbackState,
  listSnapshots,
  subscribe as subscribeSnapshots,
  createSnapshot,
  rollbackSnapshot,
  getOpenFiles,
  getRollbackState,
} from '../../../utils/snapshotStore';

type Props = {
  openApp?: (id: string) => void;
};

const formatDateTime = (value: number) => new Date(value).toLocaleString();

const describeOrigin = (snapshot: SnapshotRecord) =>
  snapshot.origin === 'auto' ? 'Automatic' : 'Manual';

const describeStatus = (snapshot: SnapshotRecord) => {
  switch (snapshot.status) {
    case 'creating':
      return 'Creating…';
    case 'restoring':
      return 'Restoring…';
    default:
      return 'Ready';
  }
};

const formatDuration = (ms?: number | null) => {
  if (!ms) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

const formatSince = (value?: number) => {
  if (!value) return '—';
  const diff = Date.now() - value;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) {
    const mins = Math.round(diff / 60_000);
    return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  }
  if (diff < 86_400_000) {
    const hrs = Math.round(diff / 3_600_000);
    return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  }
  return formatDateTime(value);
};

const SnapshotManager: React.FC<Props> = () => {
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>(() => listSnapshots());
  const [rollback, setRollback] = useState<RollbackState>(() => getRollbackState());
  const [label, setLabel] = useState('Pre-update snapshot');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const openFiles = useMemo(() => getOpenFiles(), []);

  useEffect(() => {
    const unsubscribe = subscribeSnapshots((nextSnapshots, nextRollback) => {
      setSnapshots(nextSnapshots);
      setRollback(nextRollback);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (rollback.status !== 'running' || !rollback.expectedCompletion) return;
    const id = setInterval(() => setTick(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [rollback.status, rollback.expectedCompletion]);

  useEffect(() => {
    if (rollback.status === 'completed') {
      const id = setTimeout(() => setRollback(getRollbackState()), 4_000);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [rollback.status]);

  const sortedSnapshots = useMemo(
    () => [...snapshots].sort((a, b) => b.createdAt - a.createdAt),
    [snapshots],
  );

  const activeSnapshot = rollback.snapshotId
    ? snapshots.find((snapshot) => snapshot.id === rollback.snapshotId)
    : undefined;

  const remainingSeconds = useMemo(() => {
    if (rollback.status !== 'running' || !rollback.expectedCompletion) return null;
    const diff = Math.max(0, rollback.expectedCompletion - tick);
    return Math.round(diff / 1000);
  }, [rollback.expectedCompletion, rollback.status, tick]);

  const formattedCountdown = useMemo(() => {
    if (remainingSeconds === null) return null;
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const handleCreate: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!label.trim()) {
      setError('Enter a name for the snapshot.');
      return;
    }
    setError(null);
    setIsCreating(true);
    try {
      await createSnapshot(label.trim(), {
        origin: 'manual',
        description: 'Manual checkpoint via Snapshot Manager.',
      });
      setLabel('Pre-update snapshot');
    } catch (err) {
      console.error('Failed to create snapshot', err);
      setError('Unable to create snapshot. Please retry.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRollback = async (snapshot: SnapshotRecord) => {
    const warningLines = openFiles.length
      ? `\n\nOpen files flagged for closure:\n${openFiles.map((file) => ` • ${file}`).join('\n')}`
      : '';
    const message = `Rolling back to "${snapshot.label}" will revert running apps and unsaved work.${warningLines}\n\nEnsure everything critical is saved. Continue? Target completion under 2 minutes.`;
    if (!window.confirm(message)) return;
    try {
      await rollbackSnapshot(snapshot.id);
    } catch (err) {
      console.error('Rollback failed', err);
      setError('Snapshot rollback failed. Try again after reviewing logs.');
    }
  };

  const busy = rollback.status === 'running';
  const progressPercent = Math.round(rollback.progress * 100);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white">
      <div className="px-4 py-3 border-b border-black bg-ub-warm-grey bg-opacity-40">
        <h1 className="text-lg font-semibold">Snapshot Manager</h1>
        <p className="text-sm text-gray-200">
          Capture restore points before risky updates and monitor rollback timing targets.
        </p>
        <form className="mt-3 flex flex-wrap gap-2" onSubmit={handleCreate}>
          <label className="sr-only" htmlFor="snapshot-label">
            Snapshot label
          </label>
          <input
            id="snapshot-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="px-3 py-2 bg-black bg-opacity-30 border border-black rounded flex-1 min-w-[12rem] focus:outline-none focus:ring-2 focus:ring-ub-orange"
            placeholder="Name this snapshot"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="px-4 py-2 bg-ub-drk-abrgn hover:bg-ub-orange focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-60"
          >
            {isCreating ? 'Creating…' : 'Create snapshot'}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}
        <div className="mt-3 text-xs text-gray-300">
          <span className="font-semibold">Open files monitored:</span>
          <ul className="list-disc ml-5 mt-1 space-y-1">
            {openFiles.map((file) => (
              <li key={file}>{file}</li>
            ))}
          </ul>
        </div>
        {rollback.status !== 'idle' && (
          <div className="mt-3 text-sm">
            {rollback.status === 'running' && (
              <div>
                <p>
                  Rollback in progress for{' '}
                  <span className="font-semibold">{activeSnapshot?.label ?? 'selected snapshot'}</span>
                  . Target completion {formatDuration(rollback.etaMs)} (≤ 2 minutes).
                </p>
                {formattedCountdown && (
                  <p className="text-xs text-gray-300">Projected remaining: {formattedCountdown}</p>
                )}
                <div className="mt-2 h-2 bg-black bg-opacity-40 rounded">
                  <div
                    className="h-full bg-ub-orange rounded transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                    aria-label={`Rollback progress ${progressPercent}%`}
                  />
                </div>
              </div>
            )}
            {rollback.status === 'completed' && (
              <p className="text-xs text-green-300">
                Rollback complete for {activeSnapshot?.label ?? 'selected snapshot'}.
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full text-sm bg-black bg-opacity-20 rounded">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-300">
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Size</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Last restored</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedSnapshots.map((snapshot) => (
              <tr
                key={snapshot.id}
                className="border-t border-black border-opacity-30 hover:bg-black hover:bg-opacity-30"
              >
                <td className="px-3 py-2 font-medium" title={snapshot.description}>
                  {snapshot.label}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(snapshot.createdAt)}</td>
                <td className="px-3 py-2">{describeOrigin(snapshot)}</td>
                <td className="px-3 py-2">{snapshot.size}</td>
                <td className="px-3 py-2">{describeStatus(snapshot)}</td>
                <td className="px-3 py-2">{formatSince(snapshot.lastRestoredAt)}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => handleRollback(snapshot)}
                    disabled={snapshot.status !== 'ready' || busy}
                    className="px-3 py-1 bg-black bg-opacity-60 hover:bg-opacity-80 rounded focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
                  >
                    Rollback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedSnapshots.length === 0 && (
          <p className="mt-6 text-center text-sm text-gray-300">
            No snapshots available. Create one before starting an update.
          </p>
        )}
      </div>
    </div>
  );
};

export default SnapshotManager;
