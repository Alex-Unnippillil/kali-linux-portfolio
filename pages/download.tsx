"use client";

import { useEffect, useState } from 'react';

export type ImageType = 'vm' | 'iso' | 'wsl';

export function getSuggestedImage(ua: string): ImageType {
  const lower = ua.toLowerCase();
  if (lower.includes('windows')) return 'wsl';
  if (lower.includes('mac os') || lower.includes('macintosh')) return 'vm';
  return 'iso';
}

export default function DownloadPage() {
  const [suggested, setSuggested] = useState<ImageType>('iso');
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setSuggested(getSuggestedImage(ua));
  }, []);

  const images: ImageType[] = ['vm', 'iso', 'wsl'];
  const display = showAll ? images : [suggested];

  const labelMap: Record<ImageType, string> = {
    vm: 'Virtual Machine',
    iso: 'ISO',
    wsl: 'WSL',
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Download</h1>
      {!showAll && (
        <p>
          We think the <strong>{labelMap[suggested]}</strong> image is best for you.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {display.map((type) => (
          <a
            key={type}
            href={`#${type}`}
            className="border rounded p-4 hover:bg-ub-grey"
          >
            {labelMap[type]}
          </a>
        ))}
      </div>
      {!showAll && (
        <button
          className="underline"
          onClick={() => setShowAll(true)}
        >
          Show all options
        </button>
      )}
    </div>
  );
}
