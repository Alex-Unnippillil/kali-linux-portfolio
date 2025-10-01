"use client";

import {
  createContext,
  type Dispatch,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
  type ReactNode,
} from 'react';
import usePersistentState from './usePersistentState';
import {
  applyPrivacyMode,
  clearPrivacyModeEffects,
  PRIVACY_CONSTANTS,
  PRIVACY_STORAGE_KEY,
} from '../utils/privacyMode';

interface PrivacyModeContextValue {
  enabled: boolean;
  obscured: boolean;
  temporarilyRevealed: boolean;
  setEnabled: Dispatch<SetStateAction<boolean>>;
  toggle: () => void;
  revealTemporarily: (duration?: number) => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextValue | null>(null);

export const PrivacyModeProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    PRIVACY_STORAGE_KEY,
    false,
    (value): value is boolean => typeof value === 'boolean',
  );
  const [temporarilyRevealed, setTemporarilyRevealed] = useState(false);
  const timerRef = useRef<number | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const obscured = enabled && !temporarilyRevealed;

  useEffect(() => {
    applyPrivacyMode({ enabled, obscured });
  }, [enabled, obscured]);

  useEffect(() => {
    if (!enabled) {
      setTemporarilyRevealed(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== PRIVACY_STORAGE_KEY || event.storageArea !== window.localStorage) return;
      if (event.newValue === null) {
        setEnabled(false);
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        if (typeof parsed === 'boolean') {
          setEnabled(parsed);
        }
      } catch {
        // ignore invalid payloads
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [setEnabled]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    observerRef.current?.disconnect();

    if (!obscured) {
      observerRef.current = null;
      return undefined;
    }

    const observer = new MutationObserver(() => {
      applyPrivacyMode({ enabled, obscured: true });
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
      observerRef.current = observer;
    } else {
      observerRef.current = null;
    }

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [enabled, obscured]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(timerRef.current);
      }
      observerRef.current?.disconnect();
      observerRef.current = null;
      clearPrivacyModeEffects();
    };
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, [setEnabled]);

  const revealTemporarily = useCallback(
    (duration = 10_000) => {
      if (!enabled) return;

      if (timerRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(timerRef.current);
      }

      setTemporarilyRevealed(true);
      if (typeof window !== 'undefined') {
        timerRef.current = window.setTimeout(() => {
          setTemporarilyRevealed(false);
          timerRef.current = null;
        }, duration);
      }
    },
    [enabled],
  );

  const value = useMemo<PrivacyModeContextValue>(
    () => ({ enabled, obscured, temporarilyRevealed, setEnabled, toggle, revealTemporarily }),
    [enabled, obscured, temporarilyRevealed, setEnabled, toggle, revealTemporarily],
  );

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
};

export const usePrivacyMode = () => {
  const context = useContext(PrivacyModeContext);
  if (!context) {
    throw new Error('usePrivacyMode must be used within a PrivacyModeProvider');
  }
  return context;
};

export const PRIVACY_SELECTORS = PRIVACY_CONSTANTS;

