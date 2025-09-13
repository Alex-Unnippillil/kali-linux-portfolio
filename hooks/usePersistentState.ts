"use client";

import { useState, useEffect } from 'react';

export function loadPersistentState<T>(
  key: string,
  initial: T | (() => T),
  validator?: (value: unknown) => value is T,
): T {
  const getInitial = () =>
    typeof initial === 'function' ? (initial as () => T)() : initial;
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
    // ignore parse errors
  }
  return getInitial();
}

export function savePersistentState<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}

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
  const [state, setState] = useState<T>(() =>
    loadPersistentState(key, initial, validator),
  );

  useEffect(() => {
    savePersistentState(key, state);
  }, [key, state]);

  const reset = () => setState(loadPersistentState(key, initial, validator));
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
