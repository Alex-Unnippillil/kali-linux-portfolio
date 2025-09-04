import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const InstallButton: React.FC = () => {
  // Store the install prompt event so it can be triggered later by a user action.
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    (window as any).addEventListener('beforeinstallprompt', handler);
    return () => (window as any).removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    trackEvent('cta_click', { location: 'install_button' });
    // Reset the stored event to avoid prompting multiple times.
    setDeferredPrompt(null);
  };

  if (!deferredPrompt) return null;

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
