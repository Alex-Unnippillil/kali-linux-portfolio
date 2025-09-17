"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { showA2HS } from '@/src/pwa/a2hs';
import InstallPrompt from './system/InstallPrompt';

const InstallButton: React.FC = () => {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handler = () => {
      setAvailable(true);
      setOpen(true);
    };
    (window as any).addEventListener('a2hs:available', handler);
    return () => (window as any).removeEventListener('a2hs:available', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'install_prompt_install' });
      setOpen(false);
      setAvailable(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    trackEvent('cta_dismiss', { location: 'install_prompt' });
    setOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    trackEvent('cta_open', { location: 'install_prompt' });
  }, []);

  if (!available && !open) return null;

  return (
    <>
      {available && (
        <button
          type="button"
          onClick={handleOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          ref={buttonRef}
          className="fixed bottom-6 right-6 z-[60] rounded-full bg-ubt-blue px-4 py-2 text-sm font-semibold text-ubt-grey shadow-lg transition hover:bg-ubt-green hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        >
          Install app
        </button>
      )}
      <InstallPrompt open={open} onClose={handleClose} onInstall={handleInstall} />
    </>
  );
};

export default InstallButton;
