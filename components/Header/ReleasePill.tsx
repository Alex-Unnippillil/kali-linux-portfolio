'use client';

import React, { useEffect, useState } from 'react';
import { isBrowser } from '@/utils/env';

interface ReleaseInfo {
  tag_name: string;
  html_url: string;
  name?: string;
}

const API_URL = 'https://api.github.com/repos/unnippillil/kali-linux-portfolio/releases/latest';
const STORAGE_KEY = 'release-pill-dismissed';

export default function ReleasePill() {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function fetchRelease() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) return;
        const data = await res.json();
        setRelease(data);
        if (isBrowser()) {
          const dismissed = sessionStorage.getItem(STORAGE_KEY);
          if (dismissed !== data.tag_name) {
            setVisible(true);
          }
        }
      } catch (e) {
        console.error('Failed to fetch release', e);
      }
    }
    fetchRelease();
  }, []);

  const dismiss = () => {
    if (isBrowser() && release) {
      sessionStorage.setItem(STORAGE_KEY, release.tag_name);
    }
    setVisible(false);
  };

  if (!visible || !release) return null;

  return (
    <div className="absolute top-2 right-2 flex items-center bg-blue-600 text-white text-xs rounded-full px-3 py-1 gap-2">
      <a
        href={release.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        {release.name || release.tag_name}
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-white hover:text-gray-200"
      >
        ×
      </button>
    </div>
  );
}

