import React, { useCallback, useEffect, useState } from 'react';
import type { ShortcutRecord } from '../../../services/mru/store';
import { getShortcutCandidates, setShortcutPinned } from '../../../services/mru/store';

const formatLastUsed = (timestamp: number): string => {
  if (!timestamp) return 'Not used yet';
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Not used yet';
    return date.toLocaleString();
  } catch {
    return 'Not used yet';
  }
};

type ShortcutView = ShortcutRecord & { isUpdating?: boolean };

const ShortcutSettings: React.FC = () => {
  const [shortcuts, setShortcuts] = useState<ShortcutView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const entries = await getShortcutCandidates();
      setShortcuts(entries.map((entry) => ({ ...entry, isUpdating: false })));
      setError(null);
    } catch (err) {
      console.error('Failed to load shortcut candidates', err);
      setError('Unable to load shortcuts from storage.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const togglePinned = async (entry: ShortcutView) => {
    setShortcuts((prev) =>
      prev.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              isUpdating: true,
              pinned: !entry.pinned,
            }
          : item,
      ),
    );
    try {
      await setShortcutPinned(entry.id, !entry.pinned);
      await refresh();
    } catch (err) {
      console.error('Failed to update shortcut pin', err);
      setError('Failed to update shortcut pin state.');
      setShortcuts((prev) =>
        prev.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                isUpdating: false,
                pinned: entry.pinned,
              }
            : item,
        ),
      );
    }
  };

  return (
    <section className="px-6 py-4 border-t border-gray-900 mt-6">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-ubt-grey">App Shortcuts</h2>
          <p className="text-xs text-ubt-grey/70">
            Pin the shortcuts that should appear in your installed PWA manifest.
          </p>
        </div>
        {isLoading && <span className="text-xs text-ubt-grey/70">Loading…</span>}
      </header>
      {error && (
        <div className="mb-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {shortcuts.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-col rounded border border-ubt-cool-grey/40 bg-black/20 p-3 text-ubt-grey"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">{entry.manifest.name}</h3>
                {entry.manifest.description && (
                  <p className="text-xs text-ubt-grey/70">{entry.manifest.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void togglePinned(entry)}
                disabled={entry.isUpdating}
                className={`px-3 py-1 rounded text-xs transition-colors duration-150 ${
                  entry.pinned
                    ? 'bg-ub-orange/90 text-white hover:bg-ub-orange'
                    : 'bg-ubt-cool-grey/30 text-white hover:bg-ubt-cool-grey/60'
                } ${entry.isUpdating ? 'opacity-70 cursor-wait' : ''}`}
              >
                {entry.pinned ? 'Unpin' : 'Pin'}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ubt-grey/60">
              <span className="rounded bg-black/30 px-2 py-1">{formatLastUsed(entry.lastUsed)}</span>
              <span className="rounded bg-black/30 px-2 py-1 break-all">
                {entry.manifest.url}
              </span>
              <span className="rounded bg-black/30 px-2 py-1 font-mono">
                {entry.integrity || 'sha256-…'}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {!shortcuts.length && !isLoading && (
        <p className="text-xs text-ubt-grey/70">No shortcut metadata available.</p>
      )}
    </section>
  );
};

export default ShortcutSettings;
