'use client';

import { useEffect, useMemo, useState } from 'react';
import { useBrowserContext } from './context';

type InitialState<T> = T | (() => T);

type Validator<T> = (value: unknown) => value is T;

const getValue = <T,>(initial: InitialState<T>): T =>
  typeof initial === 'function' ? (initial as () => T)() : initial;

const parseStored = <T,>(raw: string | null, validate?: Validator<T>): T | null => {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!validate || validate(parsed)) {
      return parsed as T;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
};

const useBrowserStorage = <T,>(
  key: string,
  initial: InitialState<T>,
  validate?: Validator<T>,
) => {
  const { isIncognito, storagePrefix } = useBrowserContext();
  const initialValue = useMemo(() => getValue(initial), [initial]);

  const [state, setState] = useState<T>(() => {
    if (isIncognito || typeof window === 'undefined') {
      return initialValue;
    }
    const stored = parseStored<T>(
      window.localStorage.getItem(`${storagePrefix}${key}`),
      validate,
    );
    return stored ?? initialValue;
  });

  useEffect(() => {
    if (isIncognito) return;
    try {
      window.localStorage.setItem(
        `${storagePrefix}${key}`,
        JSON.stringify(state),
      );
    } catch {
      /* ignore quota errors */
    }
  }, [isIncognito, key, state, storagePrefix]);

  return [state, setState] as const;
};

export default useBrowserStorage;
