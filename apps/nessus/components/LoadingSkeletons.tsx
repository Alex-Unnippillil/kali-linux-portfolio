'use client';

import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

const pulseClass = (reducedMotion: boolean) => (reducedMotion ? '' : 'animate-pulse');

export function PluginListSkeleton({ count = 6 }: { count?: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = pulseClass(reducedMotion);

  return (
    <ul className="space-y-2" aria-hidden>
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className={`h-16 rounded bg-gray-800 ${pulse}`} />
      ))}
    </ul>
  );
}

export function SummarySkeleton() {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = pulseClass(reducedMotion);

  return (
    <div className="space-y-4" aria-hidden>
      <div className={`h-32 rounded bg-gray-800 ${pulse}`} />
      <div className="flex gap-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={`h-8 flex-1 rounded bg-gray-800 ${pulse}`} />
        ))}
      </div>
    </div>
  );
}

export function TrendSkeleton() {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = pulseClass(reducedMotion);

  return <div className={`h-48 rounded bg-gray-800 ${pulse}`} aria-hidden />;
}
