"use client";

import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function LabMode({ children }: Props) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lab-mode');
      if (stored === 'true') setEnabled(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try {
      localStorage.setItem('lab-mode', String(next));
    } catch {
      /* ignore */
    }
  };

  const statusMessage = enabled
    ? 'Lab Mode enabled: all actions are simulated.'
    : 'Lab Mode disabled: enable to use training features.';

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="bg-ub-yellow text-black"
        aria-label="training banner"
      >
        <div className="flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Lab Mode</p>
            <p className="leading-snug">{statusMessage}</p>
          </div>
          <div className="flex w-full flex-col gap-1 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              onClick={toggle}
              className="w-full rounded bg-ub-green px-3 py-1 text-center font-semibold uppercase tracking-wide text-black sm:w-auto"
              type="button"
              aria-pressed={enabled}
            >
              {enabled ? 'Turn Off' : 'Turn On'}
            </button>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-black/80 text-center sm:text-left">
              Status: {enabled ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>
      {enabled && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </div>
  );
}

