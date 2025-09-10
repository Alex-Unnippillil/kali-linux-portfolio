"use client";

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'install-banner-dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type PromptEvent = BeforeInstallPromptEvent;

function getPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'other';
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [promptEvent, setPromptEvent] = useState<PromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error standalone not in Navigator types
      (navigator.standalone === true);
    if (isStandalone) return;

    const platform = getPlatform();
    setPlatform(platform);

    if (platform === 'ios') {
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as PromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    dismiss();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 bg-ubt-blue text-white p-4 flex flex-col sm:flex-row items-center gap-2">
      <p className="flex-1">
        {platform === 'ios'
          ? 'Install this app: tap Share and Add to Home Screen'
          : 'Install this app for quick access'}
      </p>
      {promptEvent && (
        <button
          onClick={install}
          className="bg-white text-ubt-blue px-3 py-1 rounded"
        >
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        aria-label="Dismiss install banner"
        className="px-2"
      >
        ×
      </button>
    </div>
  );
}

