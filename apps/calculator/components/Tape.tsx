'use client';

import { useCallback, useEffect, useRef } from 'react';

interface TapeProps {
  entries: { expr: string; result: string }[];
}

export default function Tape({ entries }: TapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = 0;
  }, [entries]);

  const handleRecall = useCallback((result: string) => {
    const display = document.getElementById('display') as HTMLInputElement | null;
    if (display) {
      display.value = result;
      display.dispatchEvent(new Event('input', { bubbles: true }));
      display.focus();
    }
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  return (
    <div
      ref={containerRef}
      className="tape max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-white/5 bg-[#15171d] p-4 font-mono text-sm text-slate-200 shadow-inner"
    >
      {entries.length === 0 && (
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Tape is empty
        </p>
      )}
      {entries.map(({ expr, result }, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2"
        >
          <div className="flex-1 truncate">
            {expr} = <span className="text-[#f97316]">{result}</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <button
              className="rounded-full bg-[#2a2d35] px-3 py-1 font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-[#343842]"
              onClick={() => handleRecall(result)}
              aria-label="recall result"
              type="button"
            >
              Ans
            </button>
            <button
              className="rounded-full bg-[#2a2d35] px-3 py-1 font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-[#343842]"
              onClick={() => handleCopy(result)}
              aria-label="copy result"
              type="button"
            >
              Copy
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
