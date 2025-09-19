'use client';

import { useCallback, useEffect, useState } from 'react';
import Toast from '../ui/Toast';
import { API_TIMEOUT_MS, onFetchProxy, type FetchLog } from '../../lib/fetchProxy';
import {
  API_BROADCAST_CHANNEL,
  API_CACHE_NAME,
} from '../../lib/pwa/runtimeCaching.js';

interface ToastMessage {
  id: string;
  message: string;
  duration?: number;
}

const TIMEOUT_SECONDS = Math.round(API_TIMEOUT_MS / 1000);

function getPathname(input: string, base?: string) {
  try {
    const url = new URL(input, base ?? (typeof window !== 'undefined' ? window.location.href : undefined));
    return url.pathname + url.search;
  } catch {
    return input;
  }
}

export default function ApiStatusToasts() {
  const [queue, setQueue] = useState<ToastMessage[]>([]);
  const [active, setActive] = useState<ToastMessage | null>(null);

  const pushToast = useCallback((message: string, duration?: number) => {
    setQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        message,
        duration,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!active && queue.length > 0) {
      setActive(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [queue, active]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    const shouldTrack = (entry: FetchLog) => {
      if (!entry.url) return false;
      try {
        const requestUrl = new URL(entry.url, origin);
        return requestUrl.origin === origin && requestUrl.pathname.startsWith('/api/');
      } catch {
        return false;
      }
    };

    const timeoutHandler = (event: CustomEvent<FetchLog>) => {
      const entry = event.detail;
      if (!shouldTrack(entry)) return;
      const path = getPathname(entry.url, origin);
      pushToast(
        `Request to ${path} exceeded ${TIMEOUT_SECONDS}s. Showing cached data while retrying.`,
      );
    };

    const refreshHandler = (event: CustomEvent<FetchLog>) => {
      const entry = event.detail;
      if (!entry.timedOut || !shouldTrack(entry) || entry.error) return;
      const path = getPathname(entry.url, origin);
      pushToast(`Background refresh completed for ${path}.`);
    };

    const unsubTimeout = onFetchProxy('timeout', timeoutHandler);
    const unsubEnd = onFetchProxy('end', refreshHandler);

    let channel: BroadcastChannel | null = null;
    let fallbackListener: ((event: MessageEvent) => void) | null = null;

    const handleBroadcast = (data: any) => {
      if (!data || data.type !== 'CACHE_UPDATED') return;
      const payload = data.payload || {};
      if (payload.cacheName !== API_CACHE_NAME) return;
      const updatedUrl = payload.updatedUrl as string | undefined;
      if (!updatedUrl) return;
      const path = getPathname(updatedUrl, origin);
      pushToast(`Background refresh completed for ${path}.`);
    };

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(API_BROADCAST_CHANNEL);
      channel.addEventListener('message', (event) => handleBroadcast(event.data));
    } else if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      fallbackListener = (event: MessageEvent) => {
        if (!event?.data) return;
        handleBroadcast(event.data);
      };
      try {
        navigator.serviceWorker.addEventListener('message', fallbackListener);
      } catch {
        // ignore
      }
    }

    return () => {
      unsubTimeout();
      unsubEnd();
      if (channel) {
        try {
          channel.close();
        } catch {
          // ignore
        }
      }
      if (fallbackListener && navigator?.serviceWorker) {
        try {
          navigator.serviceWorker.removeEventListener('message', fallbackListener);
        } catch {
          // ignore
        }
      }
    };
  }, [pushToast]);

  const handleClose = useCallback(() => {
    setActive(null);
  }, []);

  if (!active) return null;

  return (
    <Toast
      key={active.id}
      message={active.message}
      duration={active.duration}
      onClose={handleClose}
    />
  );
}
