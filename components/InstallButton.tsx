"use client";

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { showA2HS } from '@/src/pwa/a2hs';
import Button from '@/components/ui/Button';

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
    <Button onClick={handleInstall} className="fixed bottom-4 right-4">
      Install
    </Button>
  );
};

export default InstallButton;
