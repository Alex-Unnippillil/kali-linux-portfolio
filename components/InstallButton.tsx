"use client";

import { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

type InstallOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
  prompt(): Promise<void>;
  preventDefault(): void;
}

const InstallButton: React.FC = () => {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setInstallPromptEvent(promptEvent);
      setIsPrompting(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPromptEvent || isPrompting) return;

    const promptEvent = installPromptEvent;
    setIsPrompting(true);

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      trackEvent('cta_click', {
        location: 'install_button',
        outcome: choiceResult.outcome,
      });
    } catch (error) {
      console.error('Failed to trigger install prompt', error);
    } finally {
      setIsPrompting(false);
      setInstallPromptEvent(null);
    }
  }, [installPromptEvent, isPrompting]);

  const isAvailable = Boolean(installPromptEvent);

  const title = isAvailable
    ? 'Install this portfolio as a Progressive Web App.'
    : 'Install is available once your browser signals readiness for Progressive Web Apps.';

  return (
    <button
      type="button"
      onClick={isAvailable ? handleInstall : undefined}
      disabled={!isAvailable || isPrompting}
      title={title}
      className={`fixed bottom-4 right-4 px-3 py-1 rounded text-white transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ubt-blue ${
        isAvailable && !isPrompting
          ? 'bg-ubt-blue hover:bg-ubt-blue/90'
          : 'bg-ubt-blue/60 cursor-not-allowed'
      }`}
      aria-disabled={!isAvailable || isPrompting}
    >
      Install
    </button>
  );
};

export default InstallButton;
