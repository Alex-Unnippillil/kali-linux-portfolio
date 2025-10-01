"use client";

import { useState, useEffect, useRef } from 'react';

interface PersistentStateOptions {
  syncKey?: string;
}

/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validator optional function to validate parsed stored value
 */
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return 'null';
  }
};

export default function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  validator?: (value: unknown) => value is T,
  options: PersistentStateOptions = {},
) {
  const getInitial = () =>
    typeof initial === 'function' ? (initial as () => T)() : initial;

  const initialValueRef = useRef<T | null>(null);
  const initialSerializedRef = useRef<string>('null');

  const [state, setState] = useState<T>(() => {
    const fallback = getInitial();
    initialValueRef.current = fallback;
    if (typeof window === 'undefined') {
      initialSerializedRef.current = safeStringify(fallback);
      return fallback;
    }
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          initialSerializedRef.current = stored;
          return parsed as T;
        }
      }
    } catch {
      // ignore parsing errors and fall back
    }
    initialSerializedRef.current = safeStringify(fallback);
    return fallback;
  });

  const lastRemoteRef = useRef<string>(initialSerializedRef.current);

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [key, state]);

  const parseValue = (raw: string | null): T | null => {
    if (raw === null) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!validator || validator(parsed)) {
        return parsed as T;
      }
    } catch {
      return null;
    }
    return null;
  };

  const syncKey = options.syncKey ?? key;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== key) return;

      if (event.newValue === null) {
        const fallback = initialValueRef.current ?? getInitial();
        const serialized = safeStringify(fallback);
        lastRemoteRef.current = serialized;
        initialSerializedRef.current = serialized;
        setState(fallback);
        return;
      }

      const remoteValue = event.newValue;
      const base = lastRemoteRef.current;
      const localString = safeStringify(state);

      if (remoteValue === base) {
        lastRemoteRef.current = remoteValue;
        return;
      }

      if (localString === base) {
        const parsed = parseValue(remoteValue);
        lastRemoteRef.current = remoteValue;
        if (parsed !== null) {
          setState(parsed);
        }
        return;
      }

      if (remoteValue === localString) {
        lastRemoteRef.current = remoteValue;
        return;
      }

      const apply = (merged: string) => {
        lastRemoteRef.current = merged;
        const parsed = parseValue(merged);
        if (parsed !== null) {
          setState(parsed);
        }
        try {
          window.localStorage.setItem(key, merged);
        } catch {
          // ignore write errors
        }
      };

      window.dispatchEvent(
        new CustomEvent('snapshot-sync-conflict', {
          detail: {
            key: syncKey,
            base,
            local: localString,
            incoming: remoteValue,
            apply,
            metadata: { storageKey: key },
            onCancel: () => {
              lastRemoteRef.current = base;
            },
          },
        }),
      );
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, state, syncKey, validator]);

  const reset = () => {
    const next = getInitial();
    initialValueRef.current = next;
    const serialized = safeStringify(next);
    initialSerializedRef.current = serialized;
    lastRemoteRef.current = serialized;
    setState(next);
  };
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
