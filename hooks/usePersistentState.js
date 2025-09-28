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

const SNAP_GRID_DEFAULT = 8;
const SNAP_GRID_MIN = 4;
const SNAP_GRID_MAX = 64;

const clampGridSize = (value) => {
  if (!Number.isFinite(value)) return SNAP_GRID_DEFAULT;
  return Math.min(SNAP_GRID_MAX, Math.max(SNAP_GRID_MIN, Math.round(value)));
};

const isValidGridSize = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= SNAP_GRID_MIN && value <= SNAP_GRID_MAX;

export const useSnapSetting = () => {
  const [enabled, setEnabled] = usePersistentState(
    "snap-enabled",
    true,
    (value) => typeof value === "boolean",
  );
  const [gridSizeRaw, setGridSize] = usePersistentState(
    "snap-grid-size",
    SNAP_GRID_DEFAULT,
    isValidGridSize,
  );

  const setClampedGridSize = useCallback(
    (value) => {
      const numeric = typeof value === "number" ? value : Number(value);
      setGridSize(clampGridSize(numeric));
    },
    [setGridSize],
  );

  const gridSize = clampGridSize(gridSizeRaw);

  return [enabled, setEnabled, gridSize, setClampedGridSize];
};
