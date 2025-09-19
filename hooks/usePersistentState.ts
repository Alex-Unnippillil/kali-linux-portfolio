"use client";

import { useState, useEffect, useRef } from 'react';

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
  const getInitial = () =>
    typeof initial === 'function' ? (initial as () => T)() : initial;

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

  const skipBroadcastRef = useRef(false);
  const channelRef = useRef(`ps:${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('persistent-state', {
            detail: { key, value: state, channel: channelRef.current },
          }),
        );
      } catch {
        // ignore broadcast errors
      }
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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const computeInitial = () =>
      typeof initial === 'function' ? (initial as () => T)() : initial;

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      if (event.newValue === null) {
        skipBroadcastRef.current = true;
        setState(computeInitial());
        return;
      }
      try {
        const parsed = JSON.parse(event.newValue);
        if (!validator || validator(parsed)) {
          skipBroadcastRef.current = true;
          setState(parsed as T);
        }
      } catch {
        // ignore parse errors
      }
    };

    const handleBroadcast = (
      event: Event,
    ) => {
      const custom = event as CustomEvent<{
        key: string;
        value: unknown;
        channel?: string;
      }>;
      if (!custom.detail || custom.detail.key !== key) return;
      if (custom.detail.channel === channelRef.current) return;
      const value = custom.detail.value;
      if (validator && !validator(value)) return;
      skipBroadcastRef.current = true;
      setState(value as T);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('persistent-state', handleBroadcast as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(
        'persistent-state',
        handleBroadcast as EventListener,
      );
    };
  }, [initial, key, validator]);

  return [state, setState, reset, clear] as const;
}

export const useSnapSetting = () =>
  usePersistentState<boolean>(
    'snap-enabled',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
