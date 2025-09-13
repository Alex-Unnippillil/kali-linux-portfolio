'use client';

import { useEffect, useState } from 'react';

interface BannerData {
  show: boolean;
  message: string;
}

const STORAGE_KEY = 'release-banner-dismissed';

export default function ReleaseBanner() {
  const [data, setData] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }

    fetch('/release-banner.json')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null));
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      /* ignore */
    }
  };

  if (!data || !data.show || dismissed) return null;

  return (
    <div className="bg-ub-yellow text-black p-2 text-xs flex justify-between items-center">
      <span>{data.message}</span>
      <button
        onClick={handleDismiss}
        className="ml-4 px-2 py-1 bg-ub-grey text-black"
        type="button"
      >
        Dismiss
      </button>
    </div>
  );
}

