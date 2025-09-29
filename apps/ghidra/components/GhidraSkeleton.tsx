'use client';

import Image from 'next/image';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

export default function GhidraSkeleton() {
  const reducedMotion = usePrefersReducedMotion();
  const pulse = reducedMotion ? '' : 'animate-pulse';

  return (
    <div className="flex flex-col items-center space-y-6" aria-hidden>
      <div className={`w-64 h-40 bg-gray-800 rounded ${pulse}`} />
      <div className={`w-64 h-40 bg-gray-800 rounded ${pulse}`} />
      <div className="text-center text-sm text-gray-400 space-y-2">
        <p>Preparing the Ghidra workspace…</p>
        <p className="text-xs">Static previews are shown if the offline demo cannot start.</p>
      </div>
      <Image
        src="/themes/Yaru/apps/ghidra.svg"
        width={96}
        height={96}
        alt="Ghidra icon placeholder"
        className="opacity-60"
        priority
      />
    </div>
  );
}
