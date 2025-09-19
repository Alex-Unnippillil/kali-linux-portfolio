"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useProfileSwitcher } from './useProfileSwitcher';

// Stores state in localStorage, falling back when unavailable.
export default function usePersistedState(key, defaultValue) {
  const { storageKey, isGuest } = useProfileSwitcher();
  const storageKeyRef = useRef(null);
  const computeKey = useCallback(() => (isGuest ? null : storageKey(key)), [isGuest, key, storageKey]);
  storageKeyRef.current = computeKey();

  const [value, setValue] = useState(() => {
    const currentKey = storageKeyRef.current;
    if (typeof window === 'undefined' || !currentKey) return defaultValue;
    try {
      const item = window.localStorage.getItem(currentKey);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const currentKey = computeKey();
    storageKeyRef.current = currentKey;
    if (typeof window === 'undefined' || !currentKey) {
      setValue(defaultValue);
      return;
    }
    try {
      const item = window.localStorage.getItem(currentKey);
      setValue(item ? JSON.parse(item) : defaultValue);
    } catch {
      setValue(defaultValue);
    }
  }, [computeKey, defaultValue]);

  useEffect(() => {
    const currentKey = storageKeyRef.current;
    if (!currentKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(currentKey, JSON.stringify(value));
    } catch {
      // ignore write errors
    }
  }, [value]);

  return [value, setValue];
}
