import React from 'react';

const tileClass =
  'rounded-md bg-white/10 motion-safe:animate-pulse border border-white/10';

const SkeletonBlock = ({
  className = '',
}: {
  className?: string;
}) => (
  <div
    className={`${tileClass} ${className}`.trim()}
    data-testid="skeleton-block"
    aria-hidden="true"
  />
);

const ProjectGallerySkeleton: React.FC = () => {
  return (
    <div
      className="h-full w-full bg-ub-cool-grey text-white p-4"
      role="status"
      aria-live="polite"
      aria-label="Loading project gallery"
    >
      <span className="sr-only">Loading project gallery…</span>
      <div className="grid h-full gap-4 md:grid-cols-[260px,1fr]">
        <div className="space-y-3">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-8" />
            ))}
          </div>
          <SkeletonBlock className="h-24 w-full" />
        </div>
        <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-36" />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectGallerySkeleton;
