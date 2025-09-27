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

const WeatherSkeleton: React.FC = () => {
  return (
    <div
      className="h-full w-full bg-ub-cool-grey text-white p-4"
      role="status"
      aria-live="polite"
      aria-label="Loading weather dashboard"
    >
      <span className="sr-only">Loading weather dashboard…</span>
      <div className="flex h-full flex-col gap-4 lg:flex-row">
        <div className="flex w-full flex-col gap-3 lg:w-1/3">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-16" />
            ))}
          </div>
        </div>
        <div className="flex w-full flex-1 flex-col gap-3">
          <SkeletonBlock className="h-10 w-full" />
          <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherSkeleton;
