'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import Toast from './Toast';

export const INSTALL_PROMPT_DISMISSED_KEY = 'installPrompt:dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallPromptPlatform = 'ios' | 'android' | 'desktop';

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || navigator.platform || '';
  return /iphone|ipad|ipod/i.test(userAgent);
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) return true;
      if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
    } catch {
      // ignore matchMedia errors
    }
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  return Boolean(nav?.standalone);
};

const detectPlatform = (): InstallPromptPlatform => {
  if (isIOS()) return 'ios';
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('android')) return 'android';
  }
  return 'desktop';
};

const PLATFORM_COPY: Record<InstallPromptPlatform, { message: string; actionLabel?: string }> = {
  ios: {
    message:
      'Add Kali Linux Portfolio to your Home Screen: tap Share, then "Add to Home Screen".',
    actionLabel: 'Dismiss',
  },
  android: {
    message: 'Install Kali Linux Portfolio for quick launch on this device.',
    actionLabel: 'Install',
  },
  desktop: {
    message: 'Install the Kali Linux Portfolio app from your browser for offline access.',
    actionLabel: 'Install',
  },
};

const InstallPrompt = (): JSX.Element | null => {
  const [dismissed, setDismissed] = usePersistentState<boolean>(
    INSTALL_PROMPT_DISMISSED_KEY,
    false,
    isBoolean,
  );
  const [platform, setPlatform] = useState<InstallPromptPlatform | null>(null);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  const dismissedRef = useRef(dismissed);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    dismissedRef.current = dismissed;
  }, [dismissed]);

  useEffect(() => {
    promptEventRef.current = promptEvent;
  }, [promptEvent]);

  const hidePrompt = useCallback(() => {
    dismissedRef.current = true;
    promptEventRef.current = null;
    setVisible(false);
    setPromptEvent(null);
    setDismissed(true);
  }, [setDismissed]);

  const handleInstall = useCallback(async () => {
    const event = promptEventRef.current;
    if (event) {
      try {
        await event.prompt();
        await event.userChoice.catch(() => undefined);
      } catch {
        // ignore install prompt errors
      }
    }
    hidePrompt();
  }, [hidePrompt]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (dismissed) return undefined;
    if (isStandalone()) return undefined;

    let cancelled = false;

    const handleBeforeInstallPrompt = (evt: Event) => {
      const event = evt as BeforeInstallPromptEvent;
      if (cancelled || dismissedRef.current) return;
      event.preventDefault?.();
      promptEventRef.current = event;
      setPromptEvent(event);
      setPlatform(detectPlatform());
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);

    let iosTimer: NodeJS.Timeout | null = null;
    const initialPlatform = detectPlatform();
    if (initialPlatform === 'ios') {
      iosTimer = setTimeout(() => {
        if (cancelled || dismissedRef.current || isStandalone()) return;
        setPlatform('ios');
        setVisible(true);
      }, 2000);
    }

    return () => {
      cancelled = true;
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt as EventListener,
      );
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, [dismissed]);

  const copy = useMemo(() => (platform ? PLATFORM_COPY[platform] : null), [platform]);

  if (!visible || !copy || !platform) return null;

  const duration = platform === 'ios' ? 12000 : 15000;

  return (
    <Toast
      message={copy.message}
      actionLabel={copy.actionLabel}
      onAction={platform === 'ios' ? hidePrompt : handleInstall}
      onClose={hidePrompt}
      duration={duration}
    />
  );
};

export default InstallPrompt;
