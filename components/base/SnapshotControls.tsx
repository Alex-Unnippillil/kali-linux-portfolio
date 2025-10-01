"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSnapshot,
  SnapshotData,
  buildSnapshotRecord,
  deleteSnapshotForApp,
  getSnapshotsForApp,
  recordSnapshotEvent,
  saveSnapshotForApp,
  snapshotsAvailable,
} from '../../utils/appSnapshots';

interface SnapshotControlsProps {
  appId: string;
  title: string;
  capture: () => Promise<SnapshotData> | SnapshotData;
  restore: (snapshot: AppSnapshot) => void;
}

const SnapshotControls: React.FC<SnapshotControlsProps> = ({
  appId,
  title,
  capture,
  restore,
}) => {
  const enabled = snapshotsAvailable();
  const [open, setOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<AppSnapshot[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const refresh = useCallback(() => {
    setSnapshots(getSnapshotsForApp(appId));
  }, [appId]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  const toggle = useCallback(() => {
    if (!enabled) return;
    setOpen((value) => {
      const next = !value;
      if (next) {
        refresh();
      }
      return next;
    });
  }, [enabled, refresh]);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('touchstart', handlePointer);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('touchstart', handlePointer);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const resetForm = () => {
    setName('');
    setNote('');
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !enabled) return;
    if (!name.trim()) {
      setError('Snapshot name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await capture();
      const snapshot = buildSnapshotRecord({
        appId,
        name: name.trim(),
        note: note.trim() || undefined,
        data: result,
      });
      const next = saveSnapshotForApp(appId, snapshot);
      setSnapshots(next);
      recordSnapshotEvent('create', appId, snapshot.id);
      resetForm();
    } catch (err) {
      console.error('Failed to capture snapshot', err);
      setError('Unable to create snapshot.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (snapshot: AppSnapshot) => {
    try {
      restore(snapshot);
      recordSnapshotEvent('restore', appId, snapshot.id);
      setOpen(false);
    } catch (err) {
      console.error('Failed to restore snapshot', err);
      setError('Unable to restore snapshot.');
    }
  };

  const handleDelete = (snapshot: AppSnapshot) => {
    const next = deleteSnapshotForApp(appId, snapshot.id);
    setSnapshots(next);
    recordSnapshotEvent('delete', appId, snapshot.id);
  };

  const summary = useMemo(() => {
    if (snapshots.length === 0) return 'No snapshots yet.';
    const [latest] = snapshots;
    return `Last captured ${latest.capturedAt}`;
  }, [snapshots]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Manage snapshots"
        className="mx-1 bg-white bg-opacity-0 hover:bg-opacity-10 rounded-full flex justify-center items-center h-6 w-6"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <path d="M3 7h18" />
          <path d="M3 12h18" />
          <path d="M3 17h18" />
          <path d="M8 7l2-3h4l2 3" />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`Snapshots for ${title}`}
          className="absolute right-0 top-8 z-50 w-72 rounded-md border border-white/20 bg-ub-cool-grey text-white shadow-lg"
        >
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold">Snapshots</h3>
            <p className="text-xs text-white/70" data-testid="snapshot-summary">
              {summary}
            </p>
          </div>
          <form onSubmit={handleCreate} className="px-4 py-3 space-y-2 border-b border-white/10">
            <div className="flex flex-col gap-1">
              <label htmlFor={`snapshot-name-${appId}`} className="text-xs uppercase tracking-wide text-white/70">
                Name
              </label>
              <input
                id={`snapshot-name-${appId}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded bg-black/40 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Recon baseline"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`snapshot-note-${appId}`} className="text-xs uppercase tracking-wide text-white/70">
                Notes (optional)
              </label>
              <textarea
                id={`snapshot-note-${appId}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={2}
                className="rounded bg-black/40 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Captured after DNS scan"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={resetForm}
                className="rounded border border-white/30 px-3 py-1 text-xs uppercase tracking-wide hover:bg-white/10"
              >
                Clear
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded bg-blue-600 px-3 py-1 text-xs uppercase tracking-wide hover:bg-blue-500 disabled:opacity-50"
              >
                Save snapshot
              </button>
            </div>
          </form>
          <div className="max-h-60 overflow-y-auto">
            {snapshots.length === 0 ? (
              <p className="px-4 py-6 text-sm text-white/70">Snapshots will appear here once saved.</p>
            ) : (
              <ul className="divide-y divide-white/10">
                {snapshots.map((snapshot) => (
                  <li key={snapshot.id} className="px-4 py-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold break-words">{snapshot.name}</p>
                      <p className="text-xs text-white/60 break-words">
                        {snapshot.capturedAt} · {snapshot.data.fields.length} inputs ·{' '}
                        {snapshot.data.results.length} results
                      </p>
                      {snapshot.note && (
                        <p className="text-xs text-white/70 break-words">{snapshot.note}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(snapshot)}
                        className="flex-1 rounded bg-green-600 px-2 py-1 text-xs uppercase tracking-wide hover:bg-green-500"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(snapshot)}
                        className="rounded border border-white/30 px-2 py-1 text-xs uppercase tracking-wide hover:bg-white/10"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotControls;
