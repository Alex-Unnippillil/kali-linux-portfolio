"use client";

import { useState, useEffect, useCallback } from 'react';

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validator) {
  const getInitial = useCallback(
    () => (typeof initial === 'function' ? initial() : initial),
    [initial],
  );

  const [state, setState] = useState(() => {
    if (typeof window === 'undefined') return getInitial();
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          return parsed;
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

    const handleStorage = (event) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return;
      if (event.key !== key) return;

      if (event.newValue === null) {
        setState(getInitial());
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue);
        if (!validator || validator(parsed)) {
          setState(parsed);
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

  return [state, setState, reset, clear];
}

export const useSnapSetting = () =>
  usePersistentState(
    'snap-enabled',
    true,
    (value) => typeof value === 'boolean',
  );
