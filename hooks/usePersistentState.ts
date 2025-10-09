"use client";

import { useState, useEffect, useCallback } from 'react';

/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validator optional function to validate parsed stored value
 */
export default function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  validator?: (value: unknown) => value is T,
) {
  const getInitial = useCallback(
    () => (typeof initial === 'function' ? (initial as () => T)() : initial),
    [initial],
  );

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return getInitial();
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          return parsed as T;
        }
      }
    } catch {
      // ignore parsing errors and fall back
    }
    return getInitial();
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [key, state]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== key) return;

      if (event.newValue === null) {
        setState(getInitial());
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        if (!validator || validator(parsed)) {
          setState(parsed as T);
        }
      } catch {
        // ignore parse errors from other tabs
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [getInitial, key, validator]);

  const reset = () => setState(getInitial());
  const clear = () => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore remove errors
    }
    reset();
  };

  return [state, setState, reset, clear] as const;
}

export const useSnapSetting = () =>
  usePersistentState<boolean>(
    'snap-enabled',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
