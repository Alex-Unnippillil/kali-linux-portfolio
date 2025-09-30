"use client";

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { showA2HS } from '@/src/pwa/a2hs';

const InstallButton: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = () => setVisible(true);
    (window as any).addEventListener('a2hs:available', handler);
    return () => (window as any).removeEventListener('a2hs:available', handler);
  }, []);

  const handleInstall = async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'install_button' });
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1000] flex justify-center px-4 pb-4 pointer-events-none"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}
    >
      <button
        onClick={handleInstall}
        className="pointer-events-auto inline-flex items-center justify-center rounded-full bg-ubt-blue px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_18px_rgba(0,0,0,0.18)] ring-1 ring-white/10 transition-shadow hover:shadow-[0_5px_14px_rgba(0,0,0,0.16)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        Install
      </button>
    </div>
  );
};

export default InstallButton;
