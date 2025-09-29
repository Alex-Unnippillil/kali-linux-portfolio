'use client';

import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

export default function OpenVASSkeleton() {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = reducedMotion ? '' : 'animate-pulse';

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 space-y-6" aria-hidden>
      <div className="flex items-center justify-between">
        <div className={`h-8 w-48 bg-gray-800 rounded ${pulse}`} />
        <div className="flex gap-2">
          <div className={`h-8 w-24 bg-gray-800 rounded ${pulse}`} />
          <div className={`h-8 w-24 bg-gray-800 rounded ${pulse}`} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className={`h-20 bg-gray-800 rounded ${pulse}`} />
        ))}
      </div>
      <div className={`h-24 bg-gray-800 rounded ${pulse}`} />
      <div className={`h-64 bg-gray-800 rounded ${pulse}`} />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className={`h-12 bg-gray-800 rounded ${pulse}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={`h-6 w-24 bg-gray-800 rounded ${pulse}`} />
        ))}
      </div>
      <div className={`h-48 bg-gray-800 rounded ${pulse}`} />
    </div>
  );
}
