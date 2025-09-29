import React from 'react';

export default function QuoteAppSkeleton() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-start gap-4 overflow-auto bg-ub-cool-grey p-4 text-white">
      <div className="w-full max-w-md">
        <div className="mb-4 rounded bg-black/30 p-3">
          <div className="h-4 w-3/4 rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="mt-2 h-3 w-1/3 rounded bg-white/10 animate-pulse" aria-hidden />
        </div>
        <div className="relative rounded bg-gradient-to-br from-[var(--color-primary)]/30 to-[var(--color-secondary)]/30 p-6">
          <div className="absolute -top-4 left-4 h-12 w-12 rounded-full bg-white/10 animate-pulse" aria-hidden />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className={`h-4 rounded bg-white/20 animate-pulse ${index === 3 ? 'w-1/2' : 'w-full'}`}
                aria-hidden
              />
            ))}
            <div className="flex justify-center gap-2 pt-2">
              <div className="h-8 w-8 rounded-full bg-black/30 animate-pulse" aria-hidden />
              <div className="h-8 w-8 rounded-full bg-black/30 animate-pulse" aria-hidden />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 w-28 rounded bg-gray-700/80 animate-pulse" aria-hidden />
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <div className="h-10 w-full rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="h-10 w-full rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="h-10 w-full rounded bg-white/10 animate-pulse" aria-hidden />
        </div>
        <div className="mt-4 h-32 w-full rounded bg-black/30 animate-pulse" aria-hidden />
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <div className="h-10 w-32 rounded bg-gray-700/80 animate-pulse" aria-hidden />
          <div className="h-10 w-24 rounded bg-gray-700/80 animate-pulse" aria-hidden />
          <div className="h-5 w-20 rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="h-5 w-20 rounded bg-white/10 animate-pulse" aria-hidden />
        </div>
      </div>
    </div>
  );
}
