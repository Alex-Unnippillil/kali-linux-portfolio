"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Toast from '../ui/Toast';

const STORAGE_WARNING_THRESHOLD = 0.8;
const WARNING_BUCKET_SIZE = 5; // percent bucket to avoid duplicate warnings

const toPercent = (usage: number, quota: number): number => {
  if (!quota || quota <= 0) return 0;
  const ratio = usage / quota;
  if (!Number.isFinite(ratio)) return 0;
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
};

const normaliseUrl = (url: string): string => {
  if (typeof window === 'undefined') return url;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname || parsed.href;
  } catch {
    return url;
  }
};

const createEvictionMessage = (urls: string[]): string => {
  if (!urls.length) return '';
  const formatted = urls.map(normaliseUrl);
  const preview = formatted.slice(0, 3).join(', ');
  const remainder = formatted.length - 3;
  const suffix = remainder > 0 ? ` and ${remainder} more` : '';
  return `Removed cached content: ${preview}${suffix}.`;
};

const createStorageMessage = (usage: number, quota: number): string | null => {
  if (!quota || quota <= 0) return null;
  const ratio = usage / quota;
  if (!Number.isFinite(ratio) || ratio < STORAGE_WARNING_THRESHOLD) return null;
  const percent = toPercent(usage, quota);
  return `Storage is ${percent}% full. Offline data may be cleared automatically.`;
};

const useMessageQueue = () => {
  const [messages, setMessages] = useState<string[]>([]);
  const enqueue = useCallback((message: string) => {
    if (!message) return;
    setMessages((prev) => [...prev, message]);
  }, []);
  const dequeue = useCallback(() => {
    setMessages((prev) => prev.slice(1));
  }, []);
  const current = messages[0] ?? '';
  return useMemo(
    () => ({ current, enqueue, dequeue }),
    [current, dequeue, enqueue],
  );
};

const ServiceWorkerToastBridge = () => {
  const { current, enqueue, dequeue } = useMessageQueue();
  const warningBucketRef = useRef<number | null>(null);

  const showStorageWarning = useCallback(
    (usage?: number, quota?: number) => {
      if (typeof usage !== 'number' || typeof quota !== 'number') return;
      const message = createStorageMessage(usage, quota);
      if (!message) return;
      const percent = toPercent(usage, quota);
      const bucket = Math.floor(percent / WARNING_BUCKET_SIZE);
      if (warningBucketRef.current === bucket) return;
      warningBucketRef.current = bucket;
      enqueue(message);
    },
    [enqueue],
  );

  const handleCacheEviction = useCallback(
    (urls?: unknown) => {
      if (!Array.isArray(urls) || urls.length === 0) return;
      const message = createEvictionMessage(urls.filter((item): item is string => typeof item === 'string'));
      if (message) enqueue(message);
    },
    [enqueue],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const { serviceWorker } = navigator as Navigator & {
      serviceWorker?: ServiceWorkerContainer;
    };
    if (!serviceWorker?.addEventListener) return undefined;

    const listener = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if ('usage' in data || 'quota' in data) {
        const usage = Number((data as { usage?: number }).usage);
        const quota = Number((data as { quota?: number }).quota);
        showStorageWarning(Number.isFinite(usage) ? usage : undefined, Number.isFinite(quota) ? quota : undefined);
      }
      switch ((data as { type?: string }).type) {
        case 'storage-warning': {
          const usage = Number((data as { usage?: number }).usage);
          const quota = Number((data as { quota?: number }).quota);
          showStorageWarning(Number.isFinite(usage) ? usage : undefined, Number.isFinite(quota) ? quota : undefined);
          break;
        }
        case 'cache-evicted':
          handleCacheEviction((data as { urls?: unknown }).urls);
          break;
        default:
          break;
      }
    };

    serviceWorker.addEventListener('message', listener);
    return () => {
      serviceWorker.removeEventListener?.('message', listener);
    };
  }, [handleCacheEviction, showStorageWarning]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const storage: StorageManager | undefined = (navigator as Navigator & { storage?: StorageManager }).storage;
    let cancelled = false;
    if (!storage?.estimate) return undefined;

    storage
      .estimate()
      .then(({ usage, quota }) => {
        if (cancelled) return;
        showStorageWarning(usage, quota);
      })
      .catch(() => {
        // ignore estimation failures to avoid surfacing unhandled rejections
      });

    return () => {
      cancelled = true;
    };
  }, [showStorageWarning]);

  if (!current) return null;

  return <Toast message={current} onClose={dequeue} />;
};

export default ServiceWorkerToastBridge;

export { createEvictionMessage, createStorageMessage, STORAGE_WARNING_THRESHOLD };
