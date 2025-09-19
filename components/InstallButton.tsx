"use client";

import { useEffect, useId, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { initA2HS, showA2HS } from '@/src/pwa/a2hs';

const InstallButton: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    initA2HS();

    const handleAvailable = () => {
      if (!dismissedRef.current) {
        setVisible(true);
      }
    };

    const handleInstalled = () => {
      dismissedRef.current = true;
      setVisible(false);
    };

    window.addEventListener('a2hs:available', handleAvailable);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('a2hs:available', handleAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'install_prompt' });
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    dismissedRef.current = true;
    setVisible(false);
    trackEvent('cta_dismiss', { location: 'install_prompt' });
  };

  if (!visible) return null;

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="install-prompt pointer-events-auto self-end w-[min(20rem,90vw)] rounded-lg border border-white/10 bg-black/70 p-4 text-sm text-white shadow-lg backdrop-blur"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ubt-blue/20 text-ubt-blue"
          aria-hidden="true"
        >
          <span className="text-lg font-semibold">⬇️</span>
        </div>
        <div className="flex-1">
          <p id={titleId} className="font-semibold">
            Install Kali Linux Portfolio
          </p>
          <p id={descriptionId} className="mt-1 text-xs text-ubt-grey">
            Launch it like a native desktop with chrome, dock, and offline access.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="ml-2 rounded-full p-1 text-ubt-grey transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded border border-white/20 px-3 py-1 text-xs text-ubt-grey transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        >
          Not now
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded bg-ubt-blue px-3 py-1 text-xs font-semibold text-white transition hover:bg-ubt-blue/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Install app
        </button>
      </div>
    </section>
  );
};

export default InstallButton;
