"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfileSwitcher } from './useProfileSwitcher';

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validator) {
  const { storageKey, isGuest } = useProfileSwitcher();
  const storageKeyRef = useRef(null);
  const getInitial = useCallback(
    () => (typeof initial === 'function' ? initial() : initial),
    [initial],
  );

  const computeKey = useCallback(() => (isGuest ? null : storageKey(key)), [isGuest, key, storageKey]);
  storageKeyRef.current = computeKey();

  const [state, setState] = useState(() => {
    const currentKey = storageKeyRef.current;
    if (typeof window === 'undefined' || !currentKey) return getInitial();
    try {
      const stored = window.localStorage.getItem(currentKey);
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
          setState(parsed);
          return;
        }
      }
    } catch {
      // ignore errors and fall back to initial
    }
    setState(getInitial());
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

  return [state, setState, reset, clear];
}

export const useSnapSetting = () =>
  usePersistentState(
    "snap-enabled",
    true,
    (value) => typeof value === "boolean",
  );
