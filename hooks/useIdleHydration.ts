"use client";

import { useEffect, useState } from 'react';

type IdleCallbackHandle = number;

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

type IdleOptions = {
  timeout?: number;
};

function requestIdleFallback(callback: IdleCallback, options?: IdleOptions): IdleCallbackHandle {
  const start = Date.now();
  return window.setTimeout(() => {
    const elapsed = Date.now() - start;
    callback({
      didTimeout: Boolean(options?.timeout && elapsed > options.timeout),
      timeRemaining: () => Math.max(0, 50 - elapsed),
    });
  }, 1);
}

function cancelIdleFallback(handle: IdleCallbackHandle) {
  window.clearTimeout(handle);
}

/**
 * Defers hydration effects until the browser has idle time. Components can use
 * the returned boolean to render lightweight placeholders during critical
 * rendering phases and hydrate later without blocking the main thread.
 */
export function useIdleHydration(options?: IdleOptions) {
  const [hydrated, setHydrated] = useState(() => typeof window === 'undefined');
  const timeout = options?.timeout;

  useEffect(() => {
    if (hydrated || typeof window === 'undefined') {
      return;
    }

    const schedule =
      window.requestIdleCallback?.bind(window) ?? ((cb: IdleCallback, opts?: IdleOptions) => requestIdleFallback(cb, opts));
    const cancel = window.cancelIdleCallback?.bind(window) ?? ((handle: IdleCallbackHandle) => cancelIdleFallback(handle));

    const handle = schedule(() => {
      setHydrated(true);
    }, timeout !== undefined ? { timeout } : undefined);

    return () => {
      cancel(handle as IdleCallbackHandle);
    };
  }, [hydrated, timeout]);

  return hydrated;
}

export default useIdleHydration;
