"use client";

import { useState, useEffect, useCallback } from 'react';

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validator) {
  const getInitial = () => (typeof initial === "function" ? initial() : initial);

  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return getInitial();
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

const SNAP_SETTING_KEY = "snap-enabled";
const SNAP_SETTING_DEFAULT = true;
const SNAP_SETTING_EVENT = "snap-setting-change";

const broadcastSnapSetting = (value) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SNAP_SETTING_EVENT, { detail: value }));
};

export const useSnapSetting = () => {
  const [snapEnabled, setSnapEnabled, resetSnap, clearSnap] = usePersistentState(
    SNAP_SETTING_KEY,
    SNAP_SETTING_DEFAULT,
    (value) => typeof value === "boolean",
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleExternalUpdate = (event) => {
      const { detail } = event;
      if (typeof detail !== "boolean") return;
      setSnapEnabled((previous) => (previous === detail ? previous : detail));
    };

    window.addEventListener(SNAP_SETTING_EVENT, handleExternalUpdate);
    return () => {
      window.removeEventListener(SNAP_SETTING_EVENT, handleExternalUpdate);
    };
  }, [setSnapEnabled]);

  const setAndBroadcast = useCallback(
    (value) => {
      setSnapEnabled((previous) => {
        const nextValue = typeof value === "function" ? value(previous) : value;
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

  return [snapEnabled, setAndBroadcast, resetAndBroadcast, clearAndBroadcast];
};
