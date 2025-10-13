"use client";

import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function LabMode({ children }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [persistChoice, setPersistChoice] = useState(true);
  const [autoEnable, setAutoEnable] = useState(false);

  useEffect(() => {
    try {
      const storedPersist = localStorage.getItem('lab-mode:persist');
      if (storedPersist === 'false') {
        setPersistChoice(false);
      }

      const storedAuto = localStorage.getItem('lab-mode:auto');
      if (storedAuto === 'true') {
        setAutoEnable(true);
        setEnabled(true);
        return;
      }

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
      if (persistChoice) {
        localStorage.setItem('lab-mode', String(next));
      } else {
        localStorage.removeItem('lab-mode');
      }
    } catch {
      /* ignore */
    }
  };

  const togglePersist = () => {
    setPersistChoice((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lab-mode:persist', String(next));
        if (!next) {
          localStorage.removeItem('lab-mode');
        } else {
          localStorage.setItem('lab-mode', String(enabled));
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleAutoEnable = () => {
    setAutoEnable((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('lab-mode:auto', String(next));
        if (next) {
          setEnabled(true);
          if (persistChoice) {
            localStorage.setItem('lab-mode', 'true');
          }
        }
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const clearState = () => {
    setEnabled(false);
    setAutoEnable(false);
    try {
      localStorage.removeItem('lab-mode');
      localStorage.removeItem('lab-mode:auto');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        className="bg-ub-yellow p-2 text-xs text-black"
        aria-label="training banner"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <span className="leading-snug">
            {enabled
              ? 'Lab Mode on: actions stay simulated.'
              : 'Lab Mode off: enable for guided practice.'}
          </span>
          <div className="flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <button
              onClick={toggle}
              className="w-full rounded bg-ub-green px-2 py-1 text-xs font-semibold text-black sm:w-auto"
              type="button"
            >
              {enabled ? 'Disable' : 'Enable'}
            </button>
            <details className="w-full rounded border border-black/20 bg-white/60 p-2 text-left text-[11px] text-black sm:w-auto">
              <summary className="cursor-pointer font-semibold text-xs text-black">
                Advanced options
              </summary>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={persistChoice}
                    onChange={togglePersist}
                    aria-label="Remember Lab Mode choice"
                  />
                  <span>Remember this choice</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoEnable}
                    onChange={toggleAutoEnable}
                    aria-label="Auto-enable Lab Mode on open"
                  />
                  <span>Auto-enable on open</span>
                </label>
                <button
                  type="button"
                  onClick={clearState}
                  className="w-full rounded bg-black/10 px-2 py-1 text-left text-xs font-semibold text-black hover:bg-black/20"
                >
                  Reset saved state
                </button>
              </div>
            </details>
          </div>
        </div>
      </div>
      {enabled && (
        <div className="mt-2 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto overflow-x-hidden">{children}</div>
        </div>
      )}
    </div>
  );
}

