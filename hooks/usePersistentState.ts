"use client";

import { useState, useEffect, useRef } from 'react';

/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * Handles hydration to avoid mismatch between server and client.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validator optional function to validate parsed stored value
 */
export default function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  validator?: (value: unknown) => value is T,
) {
  const getInitial = () =>
    typeof initial === 'function' ? (initial as () => T)() : initial;

  // Initialize with default value to ensure server/client match
  const [state, setState] = useState<T>(getInitial);
  const isHydrated = useRef(false);

  useEffect(() => {
    // Load from storage on mount
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          setState(parsed);
        }
      }
    } catch {
      // ignore parsing errors
    }
    isHydrated.current = true;
  }, [key]);

  useEffect(() => {
    // Only write to storage after we've attempted to load from it
    if (!isHydrated.current) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [key, state]);

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

export const useSnapGridSetting = () =>
  usePersistentState<number[]>(
    'snap-grid',
    [8, 8],
    (value): value is number[] =>
      Array.isArray(value) &&
      value.length === 2 &&
      value.every(
        (item) => typeof item === 'number' && Number.isFinite(item) && item > 0,
      ),
  );
