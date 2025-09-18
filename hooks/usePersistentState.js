"use client";

import { useState, useEffect } from 'react';

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

export const useSnapSetting = () =>
  usePersistentState(
    "snap-enabled",
    true,
    (value) => typeof value === "boolean",
  );

export const useSnapAssistSetting = () =>
  usePersistentState(
    "snap-assist-enabled",
    true,
    (value) => typeof value === "boolean",
  );

export const useSnapCornerSetting = () =>
  usePersistentState(
    "snap-corners-enabled",
    true,
    (value) => typeof value === "boolean",
  );
