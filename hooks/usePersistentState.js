"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validator) {
  const initialRef = useRef(initial);
  useEffect(() => {
    initialRef.current = initial;
  }, [initial]);

  const getInitial = useCallback(() => {
    const value = initialRef.current;
    return typeof value === "function" ? value() : value;
  }, []);

  const [state, setState] = useState(() => getInitial());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let nextValue = getInitial();
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          nextValue = parsed;
        }
      }
    } catch {
      // ignore parsing errors and fall back to the initial value
    }

    setState((prev) => (Object.is(prev, nextValue) ? prev : nextValue));
    setReady(true);
  }, [getInitial, key, validator]);

  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore write errors
    }
  }, [key, ready, state]);

  const reset = useCallback(() => {
    setState(getInitial());
  }, [getInitial]);

  const clear = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore remove errors
      }
    }
    reset();
  }, [key, reset]);

  return [state, setState, reset, clear];
}

export const useSnapSetting = () =>
  usePersistentState(
    "snap-enabled",
    true,
    (value) => typeof value === "boolean",
  );
