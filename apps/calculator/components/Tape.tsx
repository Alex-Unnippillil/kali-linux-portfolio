'use client';

import { useCallback, useEffect, useRef } from 'react';

interface TapeProps {
  entries: { expr: string; result: string }[];
  onClear: () => void;
}

export default function Tape({ entries, onClear }: TapeProps) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = 0;
  }, [entries]);

  const focusDisplay = useCallback(() => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (display) {
      display.focus();
      const length = display.value.length;
      display.setSelectionRange(length, length);
    }
  }, []);

  const handleSelect = useCallback(
    (result: string) => {
      const display = document.getElementById('display') as HTMLInputElement | null;
      if (display) {
        display.value = result;
        focusDisplay();
      }
    },
    [focusDisplay],
  );

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  const handleClear = useCallback(() => {
    if (entries.length === 0) return;
    onClear();
    focusDisplay();
  }, [entries.length, focusDisplay, onClear]);

  return (
    <aside
      id="history"
      className="history hidden"
      aria-label="Calculator tape history"
    >
      <div className="history-header">
        <h2 className="history-title">Tape</h2>
        <button
          type="button"
          className="history-clear"
          onClick={handleClear}
          disabled={entries.length === 0}
        >
          Clear
        </button>
      </div>
      <div
        ref={listRef}
        className="history-list"
        role="list"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <p className="history-empty">Calculations will appear here.</p>
        ) : (
          entries.map(({ expr, result }, index) => (
            <div key={`${expr}-${result}-${index}`} className="history-entry" role="listitem">
              <button
                type="button"
                className="history-entry-button"
                onClick={() => handleSelect(result)}
                aria-label={`Use result ${result} from ${expr}`}
              >
                <span className="history-entry-expr" aria-hidden="true">
                  {expr}
                </span>
                <span className="history-entry-result" aria-hidden="true">
                  = {result}
                </span>
              </button>
              <button
                type="button"
                className="history-copy"
                onClick={() => handleCopy(result)}
                aria-label={`Copy result ${result} to clipboard`}
              >
                Copy
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
