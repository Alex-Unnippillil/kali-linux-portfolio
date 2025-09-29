import React from 'react';

export default function StickyNotesSkeleton() {
  return (
    <div className="flex h-full w-full flex-col gap-4 bg-ub-cool-grey p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="h-9 w-32 rounded bg-white/10 animate-pulse" aria-hidden />
        <div className="h-5 w-20 rounded bg-white/5 animate-pulse" aria-hidden />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex min-h-[160px] flex-col gap-3 rounded-lg bg-yellow-300/40 p-3 shadow-lg animate-pulse"
            aria-hidden
          >
            <div className="h-3 w-3/4 rounded bg-yellow-100/60" />
            <div className="h-3 w-4/5 rounded bg-yellow-100/60" />
            <div className="h-3 w-2/3 rounded bg-yellow-100/60" />
            <div className="mt-auto flex justify-end">
              <div className="h-6 w-6 rounded-full bg-yellow-100/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
