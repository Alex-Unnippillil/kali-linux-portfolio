import React from 'react';

export default function MainContentSkeleton() {
  return (
    <div
      className="min-h-screen w-full bg-black/40 text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading desktop environment"
      aria-busy="true"
    >
      <div className="animate-pulse space-y-6 p-6">
        <div className="h-6 w-48 rounded bg-white/20" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20"
            >
              <div className="mb-4 h-32 rounded bg-white/10" />
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-4 w-2/3 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
