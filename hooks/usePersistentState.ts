"use client";

import { useState, useEffect } from 'react';

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

export interface WindowGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isWindowGeometry = (value: unknown): value is WindowGeometry => {
  if (!value || typeof value !== 'object') return false;
  const geometry = value as WindowGeometry;
  return (
    isFiniteNumber(geometry.x) &&
    isFiniteNumber(geometry.y) &&
    isFiniteNumber(geometry.width) &&
    isFiniteNumber(geometry.height)
  );
};

const isWindowGeometryMap = (
  value: unknown,
): value is Record<string, WindowGeometry> => {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).every((entry) => isWindowGeometry(entry));
};

export const useWindowGeometryStorage = () =>
  usePersistentState<Record<string, WindowGeometry>>(
    'window-geometry',
    {},
    isWindowGeometryMap,
  );
