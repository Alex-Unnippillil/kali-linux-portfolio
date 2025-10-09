import type { Dispatch, SetStateAction } from 'react';

export type PersistentStateValidator<T> = (value: unknown) => value is T;

export type InitialValue<T> = T | (() => T);

type MaybePromise<T> = T | Promise<T>;

export function resolveInitial<T>(initial: InitialValue<T>) {
  return typeof initial === 'function' ? (initial as () => T)() : initial;
}

export function createReset<T>(
  initial: InitialValue<T>,
  setState: Dispatch<SetStateAction<T>>,
) {
  return () => setState(resolveInitial(initial));
}

export function createClear(
  reset: () => void,
  remove: () => MaybePromise<void>,
) {
  return () => {
    try {
      const result = remove();
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch(() => {
          // ignore removal errors from async stores
        });
      }
    } catch {
      // ignore removal errors
    }
    reset();
  };
}
