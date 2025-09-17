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
    <div ref={containerRef} className="tape font-mono max-h-40 overflow-y-auto">
      {entries.map(({ expr, result }, i) => (
        <div
          key={i}
          className="p-1 odd:bg-black/20 even:bg-black/10 flex items-center gap-2"
        >
          <div className="flex-1">
            {expr} = {result}
          </div>
          <button
            className="text-xs px-1 py-0.5 bg-black/20 rounded"
            onClick={() => handleRecall(result)}
            aria-label="recall result"
          >
            Ans
          </button>
          <button
            className="text-xs px-1 py-0.5 bg-black/20 rounded"
            onClick={() => handleCopy(result)}
            aria-label="copy result"
          >
            Copy
          </button>
        </div>
      ))}
    </div>
  );
}
