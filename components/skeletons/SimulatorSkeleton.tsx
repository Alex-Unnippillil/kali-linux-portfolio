import React from 'react';

const shimmer = 'motion-safe:animate-pulse bg-slate-700/70';

const SimulatorSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-inner"
  >
    <div className="flex flex-wrap gap-3">
      <div className={`h-5 w-24 rounded ${shimmer}`} />
      <div className={`h-5 w-28 rounded ${shimmer}`} />
      <div className={`h-5 w-20 rounded ${shimmer}`} />
    </div>
    <div className="mt-4 space-y-3">
      <div className={`h-10 rounded ${shimmer}`} />
      <div className={`h-10 rounded ${shimmer}`} />
    </div>
    <div className="mt-4 space-y-2">
      <div className={`h-4 w-36 rounded ${shimmer}`} />
      <div className={`h-3 w-48 rounded ${shimmer}`} />
    </div>
    <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
      <div className={`mb-2 h-4 w-24 rounded ${shimmer}`} />
      <div className="space-y-2 text-xs">
        {[0, 1, 2, 3].map((line) => (
          <div key={line} className={`h-3 w-full rounded ${shimmer}`} />
        ))}
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-3">
      <div className={`h-9 w-24 rounded ${shimmer}`} />
      <div className={`h-9 w-24 rounded ${shimmer}`} />
      <div className={`h-9 w-24 rounded ${shimmer}`} />
    </div>
    <span className="sr-only">Loading simulator...</span>
  </div>
);

export default SimulatorSkeleton;
