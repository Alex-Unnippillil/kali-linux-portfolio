"use client";

import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { showA2HS } from '@/src/pwa/a2hs';

const InstallButton: React.FC = () => {
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = () => {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    };

    const win = window as any;
    win.addEventListener('a2hs:available', handler);

    return () => {
      win.removeEventListener('a2hs:available', handler);
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleInstall = async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'install_button' });
      setIsVisible(false);
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = window.setTimeout(() => {
        setIsRendered(false);
      }, 350);
    }
  };

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 transition-transform duration-300 ease-out ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      aria-live="polite"
    >
      <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-full bg-ubt-blue/95 px-4 py-3 text-white shadow-lg backdrop-blur">
        <span className="text-sm font-medium">Install this app for quick access</span>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 ease-out hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallButton;
