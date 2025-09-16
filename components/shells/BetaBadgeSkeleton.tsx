import React from 'react';

export default function BetaBadgeSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 right-4 flex h-7 items-center justify-center rounded bg-yellow-500/40 px-3 text-xs font-semibold uppercase tracking-wide text-yellow-100/80 shadow-lg backdrop-blur-sm animate-pulse"
    >
      Beta
    </div>
  );
}
