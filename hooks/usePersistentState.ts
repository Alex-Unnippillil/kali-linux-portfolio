"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from 'react';

export type PersistentStateLogEvent<T> =
  | { type: 'read-error'; key: string; error: unknown }
  | { type: 'write-error'; key: string; value: T; error: unknown }
  | { type: 'remove-error'; key: string; error: unknown }
  | { type: 'validation-rejected'; key: string; value: unknown };

export interface UsePersistentStateOptions<T> {
  validator?: (value: unknown) => value is T;
  onEvent?: (event: PersistentStateLogEvent<T>) => void;
}

type UsePersistentStateArgs<T> =
  | ((value: unknown) => value is T)
  | UsePersistentStateOptions<T>
  | undefined;

type UsePersistentStateReturn<T> = readonly [
  T,
  Dispatch<SetStateAction<T>>,
  () => void,
  () => void,
  {
    validationError: boolean;
    clearValidationError: () => void;
  },
];

const normalizeOptions = <T,>(
  validatorOrOptions: UsePersistentStateArgs<T>,
): UsePersistentStateOptions<T> => {
  if (typeof validatorOrOptions === 'function') {
    return { validator: validatorOrOptions };
  }

  return validatorOrOptions ?? {};
};

/**
 * Persist state in localStorage.
 * Safely falls back to the provided initial value if stored data is missing or corrupt.
 * @param key localStorage key
 * @param initial initial value or function returning the initial value
 * @param validatorOrOptions validator function or configuration options
 */
export default function usePersistentState<T>(
  key: string,
  initial: T | (() => T),
  validatorOrOptions?: UsePersistentStateArgs<T>,
): UsePersistentStateReturn<T> {
  const options = normalizeOptions(validatorOrOptions);

  const getInitial = useCallback(
    () => (typeof initial === 'function' ? (initial as () => T)() : initial),
    [initial],
  );

  const logHandlerRef = useRef(options.onEvent);
  logHandlerRef.current = options.onEvent;

  const emitEvent = useCallback(
    (event: PersistentStateLogEvent<T>) => {
      logHandlerRef.current?.(event);
    },
    [],
  );

  const readStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return { value: getInitial(), validationError: false };
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!options.validator || options.validator(parsed)) {
          return { value: parsed as T, validationError: false };
        }

        emitEvent({
          type: 'validation-rejected',
          key,
          value: parsed,
        });

        return { value: getInitial(), validationError: true };
      }
    } catch (error) {
      emitEvent({
        type: 'read-error',
        key,
        error,
      });
    }

    return { value: getInitial(), validationError: false };
  }, [emitEvent, getInitial, key, options.validator]);

  const initialRef = useRef<{ value: T; validationError: boolean }>();
  if (!initialRef.current) {
    initialRef.current = readStoredValue();
  }

  const [state, setInternalState] = useState<T>(() => initialRef.current!.value);
  const [validationError, setValidationError] = useState<boolean>(
    () => initialRef.current!.validationError,
  );

  const clearValidationError = useCallback(() => {
    setValidationError(false);
  }, []);

  const setState: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      setValidationError(false);
      setInternalState((previous) =>
        typeof value === 'function'
          ? (value as (prevState: T) => T)(previous)
          : value,
      );
    },
    [],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      emitEvent({
        type: 'write-error',
        key,
        value: state,
        error,
      });
    }
  }, [emitEvent, key, state]);

  const reset = useCallback(() => {
    setValidationError(false);
    setInternalState(getInitial());
  }, [getInitial]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      emitEvent({
        type: 'remove-error',
        key,
        error,
      });
    }
    reset();
  }, [emitEvent, key, reset]);

  return [
    state,
    setState,
    reset,
    clear,
    {
      validationError,
      clearValidationError,
    },
  ] as const;
}

export const useSnapSetting = () =>
  usePersistentState<boolean>(
    'snap-enabled',
    true,
    (v): v is boolean => typeof v === 'boolean',
  );
