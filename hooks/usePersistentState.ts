"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

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
  const resolveInitial = useCallback(() => {
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  }, [initial]);

  const parseStoredValue = useCallback(
    (raw: string | null) => {
      if (raw === null) {
        return resolveInitial();
      }
      try {
        const parsed = JSON.parse(raw);
        if (!validator || validator(parsed)) {
          return parsed as T;
        }
      } catch {
        // fall through to initial value
      }
      return resolveInitial();
    },
    [resolveInitial, validator],
  );

  const readStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return resolveInitial();
    }
    try {
      const stored = window.localStorage.getItem(key);
      return parseStoredValue(stored);
    } catch {
      return resolveInitial();
    }
  }, [key, parseStoredValue, resolveInitial]);

  const [state, setState] = useState<T>(() => readStoredValue());

  const channelRef = useRef<BroadcastChannel | null>(null);
  const skipBroadcastRef = useRef(false);
  const instanceIdRef = useRef<string>(
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2),
  );

  const applyIncomingValue = useCallback(
    (raw: string | null) => {
      const nextValue = parseStoredValue(raw);
      setState((previous) => {
        if (Object.is(previous, nextValue)) {
          skipBroadcastRef.current = false;
          return previous;
        }
        skipBroadcastRef.current = true;
        return nextValue;
      });
    },
    [parseStoredValue],
  );

  useEffect(() => {
    setState(readStoredValue());
  }, [key, readStoredValue]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== key && event.key !== null) return;
      if (event.key === key) {
        applyIncomingValue(event.newValue);
      } else {
        applyIncomingValue(window.localStorage.getItem(key));
      }
    };

    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    const handleChannelMessage = (event: MessageEvent<{ source: string; value: string | null }>) => {
      if (!event || !event.data) return;
      if (event.data.source === instanceIdRef.current) return;
      applyIncomingValue(event.data.value ?? null);
    };

    if (typeof window.BroadcastChannel === 'function') {
      channel = new window.BroadcastChannel(`usePersistentState:${key}`);
      channel.addEventListener('message', handleChannelMessage);
      channelRef.current = channel;
    } else {
      channelRef.current = null;
    }

    return () => {
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.removeEventListener('message', handleChannelMessage);
        channel.close();
        if (channelRef.current === channel) {
          channelRef.current = null;
        }
      }
    };
  }, [applyIncomingValue, key]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
      return;
    }

    const serialized = JSON.stringify(state);

    try {
      window.localStorage.setItem(key, serialized);
    } catch {
      // ignore write errors
    }

    const channel = channelRef.current;
    if (channel) {
      try {
        channel.postMessage({ source: instanceIdRef.current, value: serialized });
      } catch {
        // ignore broadcast failures
      }
    }
  }, [key, state]);

  const reset = () => setState(resolveInitial());
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
