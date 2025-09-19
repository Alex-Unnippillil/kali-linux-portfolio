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

  const readValue = useCallback(
    (storageKey: string) => {
      if (typeof window === 'undefined') return getInitial();
      try {
        const stored = window.localStorage.getItem(storageKey);
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
    },
    [getInitial, validator],
  );

  const [storageKey, setStorageKey] = useState(key);
  const [state, setState] = useState<T>(() => readValue(key));

  useEffect(() => {
    if (key === storageKey) return;
    setStorageKey(key);
    setState(readValue(key));
  }, [key, readValue, storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [storageKey, state]);

  const reset = () => setState(getInitial());
  const clear = () => {
    try {
      window.localStorage.removeItem(storageKey);
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
