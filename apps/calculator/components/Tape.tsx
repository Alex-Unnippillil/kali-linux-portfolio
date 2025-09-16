'use client';

import { useCallback, useEffect, useRef } from 'react';

interface TapeProps {
  entries: { expr: string; result: string }[];
  onSelect: (entry: { expr: string; result: string }) => void;
  onClear: () => void;
}

export default function Tape({ entries, onSelect, onClear }: TapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [entries]);

  const handleSelect = useCallback(
    (entry: { expr: string; result: string }) => {
      onSelect(entry);
    },
    [onSelect],
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  return (
    <aside className="tape-panel flex w-full flex-col gap-2 md:w-60">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-white/60">
        <span>History</span>
        <button
          type="button"
          onClick={onClear}
          disabled={!entries.length}
          className="rounded border border-white/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/80 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:border-white/5 disabled:text-white/30"
        >
          Clear
        </button>
      </div>
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded border border-white/5 bg-black/30"
        aria-live="polite"
      >
        {entries.length ? (
          <ul className="divide-y divide-white/5" role="list">
            {entries.map((entry, i) => (
              <li key={`${entry.expr}-${i}`} className="group">
                <div className="flex items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleSelect(entry)}
                    className="flex-1 text-left transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label={`Insert result ${entry.result}`}
                  >
                    <span className="block text-[0.65rem] uppercase tracking-wide text-white/50">
                      {entry.expr}
                    </span>
                    <span className="block font-mono text-sm text-white">
                      = {entry.result}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(entry.result)}
                    className="rounded bg-white/10 px-2 py-1 text-[0.65rem] uppercase tracking-wide text-white/70 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    aria-label={`Copy result ${entry.result}`}
                  >
                    Copy
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-white/60">
            Calculations you run will appear here.
          </p>
        )}
      </div>
    </aside>
  );
}
