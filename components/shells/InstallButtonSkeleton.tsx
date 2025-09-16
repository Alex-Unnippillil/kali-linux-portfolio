import React from 'react';

export default function InstallButtonSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-4 right-4 flex h-10 w-28 items-center justify-center rounded-md bg-ubt-blue/50 text-sm font-medium uppercase tracking-wide text-white/70 shadow-lg backdrop-blur-sm animate-pulse"
    >
      Install
    </div>
  );
}
