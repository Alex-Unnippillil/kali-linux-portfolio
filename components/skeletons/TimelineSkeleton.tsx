import React from 'react';

const shimmer = 'motion-safe:animate-pulse bg-slate-700/70';

const TimelineSkeleton: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="w-full max-w-3xl rounded-xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-inner"
  >
    <div className="mb-6 flex items-center justify-between">
      <div className={`h-6 w-32 rounded-full ${shimmer}`} />
      <div className={`h-6 w-20 rounded-full ${shimmer}`} />
    </div>
    <div className="space-y-6">
      {[0, 1, 2].map((idx) => (
        <div key={idx} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-sky-500/70 motion-safe:animate-pulse" />
            <div className="mt-1 h-full w-px flex-1 bg-slate-700/60" />
          </div>
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-36 rounded ${shimmer}`} />
            <div className={`h-3 w-24 rounded ${shimmer}`} />
            <div className={`h-3 w-full rounded ${shimmer}`} />
            <div className={`h-3 w-5/6 rounded ${shimmer}`} />
          </div>
        </div>
      ))}
    </div>
    <div className="mt-6 flex justify-end gap-2">
      <div className={`h-5 w-20 rounded ${shimmer}`} />
      <div className={`h-5 w-24 rounded ${shimmer}`} />
    </div>
    <span className="sr-only">Loading timeline...</span>
  </div>
);

export default TimelineSkeleton;
