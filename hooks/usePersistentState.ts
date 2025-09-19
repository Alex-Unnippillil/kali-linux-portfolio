"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfileSwitcher } from './useProfileSwitcher';

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
  const { storageKey, isGuest } = useProfileSwitcher();
  const storageKeyRef = useRef<string | null>(null);
  const getInitial = useCallback(
    () => (typeof initial === 'function' ? (initial as () => T)() : initial),
    [initial],
  );

  const computeKey = useCallback(() => (isGuest ? null : storageKey(key)), [isGuest, key, storageKey]);
  storageKeyRef.current = computeKey();

  const [state, setState] = useState<T>(() => {
    const currentKey = storageKeyRef.current;
    if (typeof window === 'undefined' || !currentKey) return getInitial();
    try {
      const stored = window.localStorage.getItem(currentKey);
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
    const currentKey = computeKey();
    storageKeyRef.current = currentKey;
    if (typeof window === 'undefined' || !currentKey) {
      setState(getInitial());
      return;
    }
    try {
      const stored = window.localStorage.getItem(currentKey);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          setState(parsed as T);
          return;
        }
      }
    } catch {
      // ignore errors and fall back to initial
    }
    setState(getInitial());
    // validator intentionally included to refetch when it changes
  }, [computeKey, getInitial, validator]);

  useEffect(() => {
    const currentKey = storageKeyRef.current;
    if (!currentKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(currentKey, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [state]);

  const reset = useCallback(() => setState(getInitial()), [getInitial]);
  const clear = useCallback(() => {
    const currentKey = storageKeyRef.current;
    if (currentKey && typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(currentKey);
      } catch {
        // ignore remove errors
      }
    }
    reset();
  }, [reset]);

  return [state, setState, reset, clear] as const;
}

export const useSnapSetting = () =>
  usePersistentState<boolean>(
    'snap-enabled',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
