"use client";

import { useState, useEffect } from 'react';

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validator) {
  const getInitial = () => (typeof initial === "function" ? initial() : initial);

  // Initialize with default value to prevent hydration mismatch
  const [state, setState] = useState(getInitial);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from storage on mount
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!validator || validator(parsed)) {
          setState(parsed);
        }
      }
    } catch {
      // ignore parsing errors
    }
    setIsLoaded(true);
  }, [key]); // Intentionally omit validator to prevent reload loops if validator is unstable

  useEffect(() => {
    // Only write if loaded to prevent overwriting with default
    if (isLoaded) {
      try {
        window.localStorage.setItem(key, JSON.stringify(state));
      } catch {
        // ignore write errors
      }
    }
  }, [key, state, isLoaded]);

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

export const useSnapGridSetting = () =>
  usePersistentState(
    "snap-grid",
    [8, 8],
    (value) =>
      Array.isArray(value) &&
      value.length === 2 &&
      value.every(
        (item) => typeof item === "number" && Number.isFinite(item) && item > 0,
      ),
  );
