'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export interface TapeEntry {
  id: string;
  expr: string;
  result: string;
}

interface TapeProps {
  entries: TapeEntry[];
  onClearHistory?: () => void;
}

export default function Tape({ entries, onClearHistory }: TapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pinnedIds, setPinnedIds, , clearPinned] = usePersistentState<string[]>(
    'calc-pins',
    () => [],
    (value): value is string[] =>
      Array.isArray(value) && value.every((id) => typeof id === 'string'),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [entries]);

  useEffect(() => {
    const entryIds = new Set(entries.map((entry) => entry.id));
    setPinnedIds((current) => {
      const filtered = current.filter((id) => entryIds.has(id));
      return filtered.length === current.length ? current : filtered;
    });
  }, [entries, setPinnedIds]);

  const orderedEntries = useMemo(() => {
    if (!entries.length) return [];
    const pinnedSet = new Set(pinnedIds);
    const pinned: TapeEntry[] = [];
    const regular: TapeEntry[] = [];
    entries.forEach((entry) => {
      if (pinnedSet.has(entry.id)) pinned.push(entry);
      else regular.push(entry);
    });
    return [...pinned, ...regular];
  }, [entries, pinnedIds]);

  const handleRecall = useCallback((result: string) => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (display) display.value = result;
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // ignore clipboard errors
    }
  }, []);

  const togglePin = useCallback(
    (id: string) => {
      if (!id) return;
      setPinnedIds((current) => {
        if (current.includes(id)) {
          return current.filter((pinnedId) => pinnedId !== id);
        }
        return [...current, id];
      });
    },
    [setPinnedIds],
  );

  const handleClearHistory = useCallback(() => {
    onClearHistory?.();
    clearPinned();
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [clearPinned, onClearHistory]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      if (event.key === 'Home') {
        event.preventDefault();
        containerRef.current.scrollTop = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    },
    [],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/70">Tape</span>
        <button
          type="button"
          onClick={handleClearHistory}
          className="text-xs px-2 py-1 bg-black/40 hover:bg-black/50 transition rounded"
          aria-label="clear history"
        >
          Clear history
        </button>
      </div>
      <div
        ref={containerRef}
        className="tape font-mono max-h-40 overflow-y-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-white"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        role="list"
        aria-label="calculation history"
      >
        {orderedEntries.length === 0 ? (
          <div className="p-2 text-xs text-white/60">No history yet.</div>
        ) : (
          orderedEntries.map(({ id, expr, result }) => {
            const isPinned = pinnedIds.includes(id);
            return (
              <div
                key={id}
                role="listitem"
                data-pinned={isPinned || undefined}
                className={`p-2 flex items-center gap-2 odd:bg-black/20 even:bg-black/10 ${
                  isPinned ? 'border-l-2 border-yellow-400 bg-yellow-500/10' : ''
                }`}
              >
                <div className="flex-1">
                  {expr} = {result}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="text-xs px-1 py-0.5 bg-black/30 rounded"
                    onClick={() => togglePin(id)}
                    aria-label={isPinned ? 'unpin entry' : 'pin entry'}
                    aria-pressed={isPinned}
                  >
                    📌
                  </button>
                  <button
                    type="button"
                    className="text-xs px-1 py-0.5 bg-black/30 rounded"
                    onClick={() => handleRecall(result)}
                    aria-label="recall result"
                  >
                    Ans
                  </button>
                  <button
                    type="button"
                    className="text-xs px-1 py-0.5 bg-black/30 rounded"
                    onClick={() => handleCopy(expr)}
                    aria-label="copy expression"
                  >
                    Copy expr
                  </button>
                  <button
                    type="button"
                    className="text-xs px-1 py-0.5 bg-black/30 rounded"
                    onClick={() => handleCopy(result)}
                    aria-label="copy result"
                  >
                    Copy
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
