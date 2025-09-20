"use client";

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleClick = async () => {
    if (!deferredPrompt) return;

    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
    } catch (error) {
      // Ignore prompt errors; user dismissed or prompt is unsupported.
    }
  };

  if (!deferredPrompt) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ubt-blue"
    >
      Install
    </button>
  );
};

export default InstallPrompt;
