'use client';

import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

interface WiresharkSkeletonProps {
  rows?: number;
}

export default function WiresharkSkeleton({ rows = 8 }: WiresharkSkeletonProps) {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = reducedMotion ? '' : 'animate-pulse';

  return (
    <div className="p-4 text-white bg-ub-cool-grey h-full w-full flex flex-col space-y-3" aria-hidden>
      <div className="flex items-center space-x-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-8 w-32 rounded bg-gray-700 ${pulse}`} />
        ))}
      </div>
      <div className="flex-1 flex gap-2 overflow-hidden">
        <div className="flex-1 bg-gray-900 rounded border border-gray-800 overflow-hidden">
          <div className={`h-9 bg-gray-800 ${pulse}`} />
          <ul className="divide-y divide-gray-800">
            {Array.from({ length: rows }).map((_, index) => (
              <li key={index} className="p-2">
                <div className={`h-4 bg-gray-700 rounded ${pulse}`} />
              </li>
            ))}
          </ul>
        </div>
        <div className="w-1/3 min-w-[180px] bg-black rounded border border-gray-800 p-3 space-y-2">
          <div className={`h-4 bg-gray-700 rounded w-2/3 ${pulse}`} />
          <div className={`h-32 bg-gray-800 rounded ${pulse}`} />
          <div className={`h-16 bg-gray-900 rounded ${pulse}`} />
        </div>
      </div>
    </div>
  );
}
