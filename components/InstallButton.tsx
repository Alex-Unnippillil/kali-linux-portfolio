"use client";

import { trackEvent } from '@/lib/analytics-client';
import useInstallPrompt from '@/hooks/useInstallPrompt';

const InstallButton: React.FC = () => {
  const { available, requestInstall } = useInstallPrompt();

  const handleInstall = async () => {
    const shown = await requestInstall();
    if (shown) {
      trackEvent('cta_click', { location: 'install_button' });
    }
  };

  if (!available) return null;

  return (
    <button
      onClick={handleInstall}
      className="fixed bottom-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded"
    >
      Install
    </button>
  );
};

export default InstallButton;
