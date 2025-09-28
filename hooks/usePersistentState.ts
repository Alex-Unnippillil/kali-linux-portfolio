"use client";

import { useState, useEffect, useCallback } from 'react';

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

const SNAP_GRID_DEFAULT = 8;
const SNAP_GRID_MIN = 4;
const SNAP_GRID_MAX = 64;

const clampGridSize = (value: number) => {
  if (!Number.isFinite(value)) return SNAP_GRID_DEFAULT;
  return Math.min(SNAP_GRID_MAX, Math.max(SNAP_GRID_MIN, Math.round(value)));
};

const isValidGridSize = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= SNAP_GRID_MIN && value <= SNAP_GRID_MAX;

export const useSnapSetting = () => {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    'snap-enabled',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
  const [gridSizeRaw, setGridSize] = usePersistentState<number>(
    'snap-grid-size',
    SNAP_GRID_DEFAULT,
    isValidGridSize,
  );

  const setClampedGridSize = useCallback(
    (value: number | string) => {
      const numeric = typeof value === 'number' ? value : Number(value);
      setGridSize(clampGridSize(numeric));
    },
    [setGridSize],
  );

  const gridSize = clampGridSize(gridSizeRaw);

  return [enabled, setEnabled, gridSize, setClampedGridSize] as const;
};
