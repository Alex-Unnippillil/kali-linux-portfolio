"use client";

import { useCallback, useEffect, useState } from 'react';
import { initA2HS, showA2HS } from '@/src/pwa/a2hs';

const STANDALONE_MEDIA = '(display-mode: standalone)';

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  try {
    if (typeof window.matchMedia === 'function') {
      const media = window.matchMedia(STANDALONE_MEDIA);
      if (media?.matches) return true;
    }
  } catch {
    // ignore – matchMedia may throw in unsupported environments
  }

  return Boolean((window.navigator as any)?.standalone);
};

export default function useInstallPrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    initA2HS();

    if (!isStandalone() && window.__a2hsAvailable) {
      setAvailable(true);
    }

    const handleAvailable = () => {
      if (!isStandalone()) setAvailable(true);
    };
    const handleConsumed = () => setAvailable(false);

    window.addEventListener('a2hs:available', handleAvailable);
    window.addEventListener('a2hs:consumed', handleConsumed);
    window.addEventListener('a2hs:installed', handleConsumed);
    window.addEventListener('appinstalled', handleConsumed);

    return () => {
      window.removeEventListener('a2hs:available', handleAvailable);
      window.removeEventListener('a2hs:consumed', handleConsumed);
      window.removeEventListener('a2hs:installed', handleConsumed);
      window.removeEventListener('appinstalled', handleConsumed);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    const shown = await showA2HS();
    if (!shown) setAvailable(false);
    return shown;
  }, []);

  return { available, requestInstall } as const;
}

