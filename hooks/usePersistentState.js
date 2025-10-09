"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

const normalizeOptions = (validatorOrOptions) => {
  if (typeof validatorOrOptions === 'function') {
    return { validator: validatorOrOptions };
  }

  return validatorOrOptions ?? {};
};

// Persist state in localStorage with validation and helpers.
export default function usePersistentState(key, initial, validatorOrOptions) {
  const options = normalizeOptions(validatorOrOptions);

  const getInitial = useCallback(
    () => (typeof initial === 'function' ? initial() : initial),
    [initial],
  );

  const logHandlerRef = useRef(options.onEvent);
  logHandlerRef.current = options.onEvent;

  const emitEvent = useCallback((event) => {
    if (logHandlerRef.current) {
      logHandlerRef.current(event);
    }
  }, []);

  const readStoredValue = useCallback(() => {
    if (typeof window === 'undefined') {
      return { value: getInitial(), validationError: false };
    }

    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (!options.validator || options.validator(parsed)) {
          return { value: parsed, validationError: false };
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

  const initialRef = useRef();
  if (!initialRef.current) {
    initialRef.current = readStoredValue();
  }

  const [state, setInternalState] = useState(() => initialRef.current.value);
  const [validationError, setValidationError] = useState(
    () => initialRef.current.validationError,
  );

  const clearValidationError = useCallback(() => {
    setValidationError(false);
  }, []);

  const setState = useCallback((value) => {
    setValidationError(false);
    if (typeof value === 'function') {
      setInternalState((previous) => value(previous));
    } else {
      setInternalState(value);
    }
  }, []);

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
  ];
}

export const useSnapSetting = () =>
  usePersistentState(
    "snap-enabled",
    true,
    (value) => typeof value === "boolean",
  );
