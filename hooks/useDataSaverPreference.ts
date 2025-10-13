"use client";

import { useEffect, useMemo, useState } from 'react';

export const DATA_SAVER_STORAGE_KEY = 'qs-reduce-data-usage';
export const DATA_SAVER_EVENT = 'qs:reduce-data-preference';

const DATA_SAVER_MEDIA_QUERY = '(prefers-reduced-data: reduce)';

function readStoredPreference() {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(DATA_SAVER_STORAGE_KEY);
    if (value !== null) {
      return JSON.parse(value) === true;
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

function readMediaPreference() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  try {
    return window.matchMedia(DATA_SAVER_MEDIA_QUERY).matches;
  } catch {
    return false;
  }
}

function readAttributePreference() {
  if (typeof document === 'undefined') return null;
  return document.documentElement.hasAttribute('data-reduce-data')
    ? document.documentElement.getAttribute('data-reduce-data') !== 'false'
    : null;
}

function readPreference() {
  const attr = readAttributePreference();
  if (attr !== null) return attr;

  const stored = readStoredPreference();
  if (stored !== null) return stored;

  return readMediaPreference();
}

export default function useDataSaverPreference() {
  const [enabled, setEnabled] = useState<boolean>(() => readPreference());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleCustom = (event: Event) => {
      if (event instanceof CustomEvent && typeof event.detail?.enabled === 'boolean') {
        setEnabled(event.detail.enabled);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage && event.key === DATA_SAVER_STORAGE_KEY) {
        setEnabled(readPreference());
      }
    };

    const mediaQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia(DATA_SAVER_MEDIA_QUERY)
      : null;

    const handleMediaChange = () => {
      setEnabled(readPreference());
    };

    window.addEventListener(DATA_SAVER_EVENT, handleCustom as EventListener);
    window.addEventListener('storage', handleStorage);

    if (mediaQuery) {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleMediaChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleMediaChange);
      }
    }

    return () => {
      window.removeEventListener(DATA_SAVER_EVENT, handleCustom as EventListener);
      window.removeEventListener('storage', handleStorage);
      if (mediaQuery) {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', handleMediaChange);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(handleMediaChange);
        }
      }
    };
  }, []);

  return useMemo(() => enabled, [enabled]);
}
