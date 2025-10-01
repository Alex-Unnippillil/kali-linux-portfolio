'use client';

import { isBrowser } from './isBrowser';
import { publish, subscribe } from './pubsub';

export interface StorageQuotaSnapshot {
  supported: boolean;
  quota: number;
  usage: number;
  available: number;
  indexedDBUsage: number;
  opfsUsage: number;
  timestamp: number;
}

const STORAGE_TOPIC = 'storage:quota';

const UNSUPPORTED_SNAPSHOT: StorageQuotaSnapshot = {
  supported: false,
  quota: 0,
  usage: 0,
  available: 0,
  indexedDBUsage: 0,
  opfsUsage: 0,
  timestamp: 0,
};

async function getHandleSize(handle: any): Promise<number> {
  if (!handle) return 0;

  try {
    if (handle.kind === 'file' || typeof handle.getFile === 'function') {
      const file = await handle.getFile();
      return file?.size ?? 0;
    }

    if (handle.kind === 'directory' || typeof handle.values === 'function' || typeof handle.entries === 'function') {
      let total = 0;
      if (typeof handle.values === 'function') {
        for await (const entry of handle.values()) {
          total += await getHandleSize(entry);
        }
      } else if (typeof handle.entries === 'function') {
        for await (const entry of handle.entries()) {
          const value = Array.isArray(entry) ? entry[1] : entry;
          total += await getHandleSize(value);
        }
      } else if (Array.isArray(handle.mockEntries)) {
        for (const entry of handle.mockEntries) {
          total += await getHandleSize(entry);
        }
      }
      return total;
    }
  } catch (error) {
    // ignore individual handle errors; return best effort
  }

  if (Array.isArray(handle.mockEntries)) {
    let total = 0;
    for (const entry of handle.mockEntries) {
      total += await getHandleSize(entry);
    }
    return total;
  }

  return 0;
}

async function calculateOpfsUsage(usageDetails: StorageManagerEstimate['usageDetails'] | undefined): Promise<number> {
  const fromEstimate = usageDetails?.opfs ?? (usageDetails as any)?.fileSystem ?? 0;
  const storageManager = isBrowser ? (navigator as any).storage : undefined;
  if (!storageManager || typeof storageManager.getDirectory !== 'function') {
    return fromEstimate;
  }

  try {
    const root = await storageManager.getDirectory();
    const size = await getHandleSize(root);
    return size || fromEstimate;
  } catch {
    return fromEstimate;
  }
}

function extractIndexedDbUsage(details: StorageManagerEstimate['usageDetails'] | undefined): number {
  if (!details) return 0;
  if (typeof details.indexedDB === 'number') return details.indexedDB;
  if (typeof (details as any).idb === 'number') return (details as any).idb;
  return 0;
}

export async function getStorageSnapshot(): Promise<StorageQuotaSnapshot> {
  if (!isBrowser) return { ...UNSUPPORTED_SNAPSHOT, timestamp: Date.now() };
  const storageManager: StorageManager | undefined = (navigator as any).storage;
  if (!storageManager || typeof storageManager.estimate !== 'function') {
    return { ...UNSUPPORTED_SNAPSHOT, timestamp: Date.now() };
  }

  try {
    const estimate = await storageManager.estimate();
    const quota = typeof estimate.quota === 'number' ? estimate.quota : 0;
    const rawUsage = typeof estimate.usage === 'number' ? estimate.usage : 0;
    const indexedDBUsage = extractIndexedDbUsage(estimate.usageDetails);
    const opfsUsage = await calculateOpfsUsage(estimate.usageDetails);

    const derivedUsage = rawUsage || indexedDBUsage + opfsUsage;
    const usage = derivedUsage || 0;
    const effectiveQuota = quota || Math.max(usage, 0);
    const available = Math.max(0, effectiveQuota - usage);

    return {
      supported: true,
      quota: effectiveQuota,
      usage,
      available,
      indexedDBUsage,
      opfsUsage,
      timestamp: Date.now(),
    };
  } catch {
    return { ...UNSUPPORTED_SNAPSHOT, timestamp: Date.now() };
  }
}

export function subscribeToQuota(callback: (snapshot: StorageQuotaSnapshot) => void): () => void {
  return subscribe(STORAGE_TOPIC, callback as (data: unknown) => void);
}

export async function refreshQuota(): Promise<StorageQuotaSnapshot> {
  const snapshot = await getStorageSnapshot();
  publish(STORAGE_TOPIC, snapshot);
  return snapshot;
}

let refreshScheduled = false;

export function requestQuotaCheck(): void {
  if (!isBrowser) return;
  if (refreshScheduled) return;
  refreshScheduled = true;
  Promise.resolve()
    .then(() => refreshQuota())
    .catch(() => undefined)
    .finally(() => {
      refreshScheduled = false;
    });
}
