"use client";

import { useEffect, useMemo, useState } from 'react';
import { del, get, set } from 'idb-keyval';

import {
  createClear,
  createReset,
  resolveInitial,
  type InitialValue,
  type PersistentStateValidator,
} from './persistentStateShared';

export default function useIDBPersistentState<T>(
  key: string,
  initial: InitialValue<T>,
  validator?: PersistentStateValidator<T>,
) {
  const getInitial = () => resolveInitial(initial);
  const [state, setState] = useState<T>(getInitial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const stored = await get(key);
        if (!cancelled && stored !== undefined) {
          if (!validator || validator(stored)) {
            setState(stored as T);
          }
        }
      } catch {
        // ignore read errors and fall back to initial value
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [key, validator]);

  useEffect(() => {
    if (!hydrated) return;
    set(key, state).catch(() => {
      // ignore write errors
    });
  }, [hydrated, key, state]);

  const reset = useMemo(() => createReset(initial, setState), [initial, setState]);
  const clear = useMemo(
    () =>
      createClear(reset, () => {
        return del(key);
      }),
    [key, reset],
  );

  return [state, setState, reset, clear] as const;
}
