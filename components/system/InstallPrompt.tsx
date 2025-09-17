"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';

type PromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: PromptOutcome; platform: string }>;
  prompt(): Promise<void>;
}

type StoredOutcome = {
  outcome: PromptOutcome;
  timestamp: number;
};

const STORAGE_KEY = 'kali-linux-portfolio.installPrompt';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // one week

const supportsBeforeInstallPrompt = () =>
  typeof window !== 'undefined' &&
  ('BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window);

const readStoredOutcome = (): StoredOutcome | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredOutcome>;
    if (
      (parsed.outcome === 'accepted' || parsed.outcome === 'dismissed') &&
      typeof parsed.timestamp === 'number'
    ) {
      return parsed as StoredOutcome;
    }
  } catch {
    // ignore malformed storage
  }

  return null;
};

const persistOutcome = (outcome: PromptOutcome) => {
  if (typeof window === 'undefined') return;

  try {
    const record: StoredOutcome = { outcome, timestamp: Date.now() };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore storage errors
  }
};

const clearStoredOutcome = () => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

const shouldSnoozePrompt = (record: StoredOutcome | null) => {
  if (!record) return false;
  if (record.outcome === 'accepted') return true;

  if (Date.now() - record.timestamp < DISMISS_COOLDOWN_MS) {
    return true;
  }

  clearStoredOutcome();
  return false;
};

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;

  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
    } catch {
      // ignore matchMedia errors
    }
  }

  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const InstallPrompt = () => {
  const [ctaVisible, setCtaVisible] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [supportStatus, setSupportStatus] = useState<'unknown' | 'supported' | 'unsupported'>(
    'unknown',
  );
  const [isPrompting, setIsPrompting] = useState(false);
  const promptEventRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = readStoredOutcome();
    if (stored?.outcome === 'accepted') {
      setSupportStatus('supported');
      return;
    }

    if (isStandaloneMode()) {
      persistOutcome('accepted');
      setSupportStatus('supported');
      return;
    }

    if (!supportsBeforeInstallPrompt()) {
      setSupportStatus((prev) => (prev === 'unknown' ? 'unsupported' : prev));
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setSupportStatus('supported');

      const record = readStoredOutcome();
      if (shouldSnoozePrompt(record)) {
        promptEventRef.current = null;
        return;
      }

      promptEventRef.current = promptEvent;
      setStatusMessage(null);
      setCtaVisible(true);
    };

    const handleAppInstalled = () => {
      persistOutcome('accepted');
      promptEventRef.current = null;
      setCtaVisible(false);
      setStatusMessage('App installed! Find it in your browser\'s app list.');
      setSupportStatus('supported');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const promptEvent = promptEventRef.current;
    if (!promptEvent) return;

    setIsPrompting(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      persistOutcome(choice.outcome);
      trackEvent('cta_click', { location: 'install_prompt', outcome: choice.outcome });

      setStatusMessage(
        choice.outcome === 'accepted'
          ? 'App installed! Find it in your browser\'s app list.'
          : 'Install dismissed. You can use your browser menu to install later.',
      );
    } catch (error) {
      console.error('Install prompt failed', error);
      setStatusMessage('Unable to open the install prompt. Please try again later.');
    } finally {
      promptEventRef.current = null;
      setCtaVisible(false);
      setIsPrompting(false);
    }
  }, []);

  const shouldRender = ctaVisible || statusMessage || supportStatus === 'unsupported';

  if (!shouldRender) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs text-white" aria-live="polite">
      <div className="rounded-lg border border-white/10 bg-black/70 p-4 shadow-lg backdrop-blur">
        {ctaVisible ? (
          <>
            <p className="mb-3 text-sm font-medium">Install Kali Linux Portfolio</p>
            <p className="mb-4 text-xs text-white/80">
              Add this desktop experience to your home screen for quicker access.
            </p>
            <button
              type="button"
              onClick={handleInstall}
              className="w-full rounded bg-ubt-blue px-3 py-2 text-sm font-semibold text-white hover:bg-ubt-blue/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPrompting}
            >
              {isPrompting ? 'Opening browser prompt…' : 'Install'}
            </button>
          </>
        ) : statusMessage ? (
          <p className="text-sm" role="status">
            {statusMessage}
          </p>
        ) : (
          <p className="text-sm" role="status">
            Install prompts aren\'t supported here. Use your browser menu to add this app to your
            home screen.
          </p>
        )}
      </div>
    </div>
  );
};

export default InstallPrompt;
