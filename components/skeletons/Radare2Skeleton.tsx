import React from 'react';

const SkeletonBlock = ({
  className = '',
}: {
  className?: string;
}) => (
  <div
    className={`rounded-md bg-white/10 motion-safe:animate-pulse border border-white/10 ${className}`.trim()}
    data-testid="skeleton-block"
    aria-hidden="true"
  />
);

const Radare2Skeleton: React.FC = () => {
  return (
    <div
      className="h-full w-full bg-[#0f1016] p-4 text-white"
      role="status"
      aria-live="polite"
      aria-label="Loading Radare2 workspace"
    >
      <span className="sr-only">Loading Radare2 workspace…</span>
      <div className="flex flex-wrap items-center gap-3">
        <SkeletonBlock className="h-12 w-12 rounded-full" />
        <SkeletonBlock className="h-9 w-32" />
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-9 w-24" />
        <SkeletonBlock className="h-9 w-28" />
      </div>
      <div className="mt-4 grid h-[calc(100%-4rem)] gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-10 w-40" />
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-80 w-full" />
        </div>
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-10 w-48" />
          <SkeletonBlock className="h-64 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonBlock className="h-32 w-full" />
            <SkeletonBlock className="h-32 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Radare2Skeleton;
