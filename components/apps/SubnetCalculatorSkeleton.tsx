import React from 'react';

export default function SubnetCalculatorSkeleton() {
  return (
    <div className="h-full w-full overflow-auto bg-ub-cool-grey text-white">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
        <header className="space-y-2">
          <div className="h-8 w-56 rounded bg-white/10 animate-pulse" aria-hidden />
          <div className="h-4 w-full max-w-xl rounded bg-white/10 animate-pulse" aria-hidden />
        </header>
        <div className="grid gap-4 rounded-md bg-black/30 p-4 sm:grid-cols-2">
          {[1, 2].map((item) => (
            <div key={item} className="flex flex-col gap-2">
              <div className="h-3 w-32 rounded bg-white/10 animate-pulse" aria-hidden />
              <div className="h-10 rounded border border-white/10 bg-black/60 animate-pulse" aria-hidden />
            </div>
          ))}
        </div>
        <section className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((column) => (
            <div key={column} className="space-y-4">
              <div className="h-5 w-40 rounded bg-white/10 animate-pulse" aria-hidden />
              <div className="grid gap-4">
                {[1, 2, 3].map((card) => (
                  <div key={card} className="rounded-md border border-white/10 bg-black/40 p-4">
                    <div className="h-3 w-24 rounded bg-white/10 animate-pulse" aria-hidden />
                    <div className="mt-3 h-4 w-3/4 rounded bg-white/10 animate-pulse" aria-hidden />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
