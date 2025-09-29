import { useCallback, useEffect, useMemo, useRef } from 'react';

type AnyFunction = (...args: any[]) => void;

type Cancelable = {
  cancel: () => void;
  flush: () => void;
};

export interface DebounceOptions {
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface ThrottleOptions {
  leading?: boolean;
  trailing?: boolean;
}

export type DebouncedFunction<T extends AnyFunction> = T & Cancelable;
export type ThrottledFunction<T extends AnyFunction> = T & Cancelable;

const normalizeDebounceOptions = (
  options?: DebounceOptions
): DebounceOptions | undefined => {
  if (!options) return undefined;
  const normalized: DebounceOptions = {};
  if (typeof options.leading === 'boolean') normalized.leading = options.leading;
  if (typeof options.trailing === 'boolean') normalized.trailing = options.trailing;
  if (typeof options.maxWait === 'number') normalized.maxWait = options.maxWait;
  return normalized;
};

const normalizeThrottleOptions = (
  options?: ThrottleOptions
): ThrottleOptions | undefined => {
  if (!options) return undefined;
  const normalized: ThrottleOptions = {};
  if (typeof options.leading === 'boolean') normalized.leading = options.leading;
  if (typeof options.trailing === 'boolean') normalized.trailing = options.trailing;
  return normalized;
};

export function createDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delay: number,
  { leading = false, trailing = true, maxWait }: DebounceOptions = {}
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  const invoke = (time: number) => {
    if (!lastArgs) return;
    lastInvokeTime = time;
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = undefined;
    callback.apply(thisArg as never, args);
  };

  const startTimer = (pendingFunc: () => void, wait: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(pendingFunc, wait);
  };

  const shouldInvoke = (time: number) => {
    if (lastCallTime === null) return true;
    const timeSinceLastCall = time - lastCallTime;
    const timeSinceLastInvoke = time - lastInvokeTime;
    return (
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (typeof maxWait === 'number' && timeSinceLastInvoke >= maxWait)
    );
  };

  const trailingEdge = (time: number) => {
    timer = null;
    if (trailing && lastArgs) {
      invoke(time);
    }
  };

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timer === null) {
        if (leading) {
          invoke(time);
        }
        startTimer(() => trailingEdge(Date.now()), delay);
      } else if (typeof maxWait === 'number') {
        startTimer(() => trailingEdge(Date.now()), delay);
      }
    } else if (timer === null) {
      startTimer(() => trailingEdge(Date.now()), delay);
    }
  } as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastInvokeTime = 0;
    lastArgs = null;
    lastThis = undefined;
    lastCallTime = null;
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      trailingEdge(Date.now());
    }
  };

  return debounced;
}

export function createThrottledCallback<T extends AnyFunction>(
  callback: T,
  interval: number,
  { leading = true, trailing = true }: ThrottleOptions = {}
): ThrottledFunction<T> {
  let lastExecution = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: unknown;

  const invoke = (time: number) => {
    if (!lastArgs) return;
    lastExecution = time;
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = null;
    lastThis = undefined;
    callback.apply(thisArg as never, args);
  };

  const startTimer = (wait: number) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (trailing && lastArgs) {
        invoke(Date.now());
      }
    }, wait);
  };

  const throttled = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now();
    if (!lastExecution && !leading) {
      lastExecution = now;
    }

    const remaining = interval - (now - lastExecution);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > interval) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      invoke(now);
    } else if (!timer && trailing) {
      startTimer(remaining);
    }
  } as ThrottledFunction<T>;

  throttled.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    lastExecution = 0;
    lastArgs = null;
    lastThis = undefined;
  };

  throttled.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (lastArgs) {
        invoke(Date.now());
      }
    }
  };

  return throttled;
}

export function useDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delay: number,
  options?: DebounceOptions
): DebouncedFunction<T> {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const memoizedOptions = useMemo(() => normalizeDebounceOptions(options), [options]);

  const debounced = useMemo(
    () =>
      createDebouncedCallback(
        ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
        delay,
        memoizedOptions
      ),
    [delay, memoizedOptions]
  );

  useEffect(() => () => debounced.cancel(), [debounced]);

  return debounced;
}

export function useThrottledEvent<T extends AnyFunction>(
  callback: T,
  interval: number,
  options?: ThrottleOptions
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const memoizedOptions = useMemo(() => normalizeThrottleOptions(options), [options]);

  const throttled = useMemo(
    () =>
      createThrottledCallback(
        ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
        interval,
        memoizedOptions
      ),
    [interval, memoizedOptions]
  );

  useEffect(() => () => throttled.cancel(), [throttled]);

  return useCallback(
    ((...args: Parameters<T>) => {
      const firstArg = args[0];
      if (firstArg && typeof (firstArg as { persist?: () => void }).persist === 'function') {
        (firstArg as { persist?: () => void }).persist?.();
      }
      throttled(...args);
    }) as T,
    [throttled]
  );
}
