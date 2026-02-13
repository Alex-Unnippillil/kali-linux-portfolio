'use client';

import { useRef } from 'react';

export default function BadgeControls() {
  const originalTitle = useRef<string | null>(null);

  const setTitleBadge = (val: string) => {
    if (typeof document === 'undefined') return;
    if (!originalTitle.current) originalTitle.current = document.title;
    document.title = `${val} ${originalTitle.current}`;
  };

  const clearTitleBadge = () => {
    if (typeof document === 'undefined') return;
    if (originalTitle.current !== null) {
      document.title = originalTitle.current;
      originalTitle.current = null;
    }
  };

  const setDot = () => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.setAppBadge) {
      nav.setAppBadge().catch(() => {});
    } else {
      setTitleBadge('•');
    }
  };

  const setNumber = (n = 5) => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.setAppBadge) {
      nav.setAppBadge(n).catch(() => {});
    } else {
      setTitleBadge(`(${n})`);
    }
  };

  const clear = () => {
    const nav: any = typeof navigator !== 'undefined' ? navigator : null;
    if (nav?.clearAppBadge) {
      nav.clearAppBadge().catch(() => {});
    } else {
      clearTitleBadge();
    }
  };

  const handleKey = (fn: () => void) => (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={setDot}
        onKeyDown={handleKey(setDot)}
        aria-label="Set app badge to dot"
        className="border px-2 py-1 rounded"
      >
        Set dot
      </button>
      <button
        type="button"
        onClick={() => setNumber(5)}
        onKeyDown={handleKey(() => setNumber(5))}
        aria-label="Set app badge to number"
        className="border px-2 py-1 rounded"
      >
        Set N
      </button>
      <button
        type="button"
        onClick={clear}
        onKeyDown={handleKey(clear)}
        aria-label="Clear app badge"
        className="border px-2 py-1 rounded"
      >
        Clear
      </button>
    </div>
  );
}

