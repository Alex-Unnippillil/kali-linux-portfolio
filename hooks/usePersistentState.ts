"use client";

import { useEffect, useMemo, useState } from 'react';

import {
  createClear,
  createReset,
  resolveInitial,
  type InitialValue,
  type PersistentStateValidator,
} from './persistentStateShared';

/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validator optional function to validate parsed stored value
 */
export default function usePersistentState<T>(
  key: string,
  initial: InitialValue<T>,
  validator?: PersistentStateValidator<T>,
) {
  const getInitial = () => resolveInitial(initial);

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

  const reset = useMemo(() => createReset(initial, setState), [initial, setState]);
  const clear = useMemo(
    () =>
      createClear(reset, () => {
        window.localStorage.removeItem(key);
      }),
    [key, reset],
  );

  return [state, setState, reset, clear] as const;
}

export type { PersistentStateValidator } from './persistentStateShared';

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
