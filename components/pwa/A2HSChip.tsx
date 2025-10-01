"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { trackEvent } from '@/lib/analytics-client';
import {
  dismissA2HS,
  initA2HS,
  isA2HSSuppressed,
  isBeforeInstallPromptSupported,
  recordNavigationEvent,
  showA2HS,
} from '@/src/pwa/a2hs';

const CHIP_CONTAINER =
  'fixed bottom-4 right-4 z-[1000] flex items-center gap-2 rounded-full bg-slate-900/90 px-3 py-2 text-sm text-white shadow-lg backdrop-blur';
const ACTION_BUTTON =
  'rounded-full border border-white/40 px-3 py-1 text-xs font-medium uppercase tracking-wide transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white';

const A2HSChip = () => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [supported] = useState(() => isBeforeInstallPromptSupported());

  useEffect(() => {
    if (!supported) return;
    initA2HS();

    const handleAvailable = () => {
      if (isA2HSSuppressed()) return;
      setVisible(true);
    };

    window.addEventListener('a2hs:available', handleAvailable);

    return () => {
      window.removeEventListener('a2hs:available', handleAvailable);
    };
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    const handleNavigation = () => {
      recordNavigationEvent();
    };

    recordNavigationEvent();
    router.events?.on('routeChangeComplete', handleNavigation);

    return () => {
      router.events?.off('routeChangeComplete', handleNavigation);
    };
  }, [router.events, supported]);

  const handleInstall = useCallback(async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'a2hs_chip_install' });
      setVisible(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    dismissA2HS();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className={CHIP_CONTAINER} role="dialog" aria-live="polite">
      <span className="font-medium">Install this app?</span>
      <div className="flex items-center gap-1">
        <button type="button" className={clsx(ACTION_BUTTON, 'bg-white/10')} onClick={handleInstall}>
          Install
        </button>
        <button type="button" className={ACTION_BUTTON} onClick={handleDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default A2HSChip;

