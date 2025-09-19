import React from 'react';

const shimmer = 'motion-safe:animate-pulse bg-slate-700/70';

const ChartSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="w-full rounded-lg border border-slate-700/80 bg-slate-900/80 p-4 shadow-inner"
  >
    <div className="relative h-32 overflow-hidden rounded bg-slate-800/70">
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-around px-6">
        <div className={`h-20 w-10 rounded-t ${shimmer}`} />
        <div className={`h-16 w-10 rounded-t ${shimmer}`} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
    </div>
    <div className="mt-4 flex justify-around text-xs uppercase tracking-wide text-slate-400">
      <div className={`h-3 w-16 rounded ${shimmer}`} />
      <div className={`h-3 w-16 rounded ${shimmer}`} />
    </div>
    <span className="sr-only">Loading chart...</span>
  </div>
);

export default ChartSkeleton;
