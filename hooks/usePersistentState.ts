"use client";

import {
  useState,
  useEffect,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react';

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

  useEffect(() => {
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

const SNAP_SETTING_KEY = 'snap-enabled';
const SNAP_SETTING_DEFAULT = true;
const SNAP_SETTING_EVENT = 'snap-setting-change';

const broadcastSnapSetting = (value: boolean) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<boolean>(SNAP_SETTING_EVENT, { detail: value }),
  );
};

export const useSnapSetting = () => {
  const [snapEnabled, setSnapEnabled, resetSnap, clearSnap] =
    usePersistentState<boolean>(
      SNAP_SETTING_KEY,
      SNAP_SETTING_DEFAULT,
      (v): v is boolean => typeof v === 'boolean',
    );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleExternalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      if (typeof detail !== 'boolean') return;
      setSnapEnabled((previous) => (previous === detail ? previous : detail));
    };

    window.addEventListener(SNAP_SETTING_EVENT, handleExternalUpdate as EventListener);
    return () => {
      window.removeEventListener(
        SNAP_SETTING_EVENT,
        handleExternalUpdate as EventListener,
      );
    };
  }, [setSnapEnabled]);

  const setAndBroadcast: Dispatch<SetStateAction<boolean>> = useCallback(
    (value) => {
      setSnapEnabled((previous) => {
        const nextValue =
          typeof value === 'function' ? value(previous) : value;
        if (nextValue !== previous) {
          broadcastSnapSetting(nextValue);
        }
        return nextValue;
      });
    },
    [setSnapEnabled],
  );

  const resetAndBroadcast = useCallback(() => {
    resetSnap();
    broadcastSnapSetting(SNAP_SETTING_DEFAULT);
  }, [resetSnap]);

  const clearAndBroadcast = useCallback(() => {
    clearSnap();
    broadcastSnapSetting(SNAP_SETTING_DEFAULT);
  }, [clearSnap]);

  return [snapEnabled, setAndBroadcast, resetAndBroadcast, clearAndBroadcast] as const;
};
