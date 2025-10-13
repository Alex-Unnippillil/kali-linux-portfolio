import type { IDBPDatabase } from 'idb';
import { getDb } from './safeIDB';
import { hasIndexedDB, isBrowser } from './isBrowser';

const DB_NAME = 'offlineSubmissions';
const STORE_NAME = 'queue';
const DB_VERSION = 1;
const LOCAL_STORAGE_KEY = 'offline-submissions-queue';
const MAX_ATTEMPTS = 5;

interface StoredSubmission {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  checksum: number;
  createdAt: number;
  attempts: number;
  dedupeKey?: string;
  lastError?: string;
}

type HeadersRecord = Record<string, string>;

export type SerializableBody =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | unknown[];

export interface OfflineSubmissionRequest {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: SerializableBody;
  dedupeKey?: string;
}

export type SendWithOfflineQueueResult =
  | { status: 'queued'; reason: string }
  | { status: 'sent'; response: Response };

let dbPromise: Promise<IDBPDatabase<any>> | null = null;
let fallbackQueue: StoredSubmission[] = [];
let queueInitialized = false;

const getQueueDb = (): Promise<IDBPDatabase<any>> | null => {
  if (!hasIndexedDB) return null;
  if (!dbPromise) {
    const opened = getDb(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase<any>, oldVersion: number) {
        if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      },
    });

    if (opened) {
      dbPromise = opened as Promise<IDBPDatabase<any>>;
    }
  }
  return dbPromise;
};

const computeChecksum = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const normalizeHeaders = (input?: HeadersInit): HeadersRecord => {
  if (!input) return {};
  const result: HeadersRecord = {};
  if (Array.isArray(input)) {
    for (const [key, value] of input) {
      if (typeof key === 'string') {
        result[key] = String(value);
      }
    }
    return result;
  }
  if (input instanceof Headers) {
    input.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  return Object.entries(input).reduce<HeadersRecord>((acc, [key, value]) => {
    acc[key] = String(value);
    return acc;
  }, {});
};

const serializeBody = (body?: SerializableBody): string => {
  if (body === undefined || body === null) {
    return '';
  }
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'number' || typeof body === 'boolean') {
    return JSON.stringify(body);
  }
  try {
    return JSON.stringify(body);
  } catch {
    throw new Error('Body is not serializable');
  }
};

const getFallbackQueue = (): StoredSubmission[] => {
  if (!isBrowser) return [...fallbackQueue];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [...fallbackQueue];
    const parsed = JSON.parse(raw) as StoredSubmission[];
    if (Array.isArray(parsed)) {
      fallbackQueue = parsed.filter((entry) =>
        Boolean(entry && typeof entry.id === 'string' && typeof entry.body === 'string'),
      );
    }
  } catch {
    // ignore corrupt data
  }
  return [...fallbackQueue];
};

const writeFallbackQueue = (entries: StoredSubmission[]): void => {
  fallbackQueue = entries;
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
};

const putEntry = async (entry: StoredSubmission): Promise<void> => {
  const db = getQueueDb();
  if (db) {
    const resolved = await db;
    const tx = resolved.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(entry);
    await tx.done;
    return;
  }
  const entries = getFallbackQueue();
  const index = entries.findIndex((item) => item.id === entry.id);
  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }
  writeFallbackQueue(entries);
};

const removeEntry = async (id: string): Promise<void> => {
  const db = getQueueDb();
  if (db) {
    const resolved = await db;
    const tx = resolved.transaction(STORE_NAME, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    return;
  }
  const entries = getFallbackQueue().filter((entry) => entry.id !== id);
  writeFallbackQueue(entries);
};

const getAllEntries = async (): Promise<StoredSubmission[]> => {
  const db = getQueueDb();
  if (db) {
    const resolved = await db;
    const tx = resolved.transaction(STORE_NAME, 'readonly');
    const entries = await tx.store.getAll();
    await tx.done;
    return entries
      .filter((entry) => computeChecksum(entry.body) === entry.checksum)
      .sort((a, b) => a.createdAt - b.createdAt);
  }
  return getFallbackQueue()
    .filter((entry) => computeChecksum(entry.body) === entry.checksum)
    .sort((a, b) => a.createdAt - b.createdAt);
};

const clearEntries = async (): Promise<void> => {
  const db = getQueueDb();
  if (db) {
    const resolved = await db;
    const tx = resolved.transaction(STORE_NAME, 'readwrite');
    await tx.store.clear();
    await tx.done;
    return;
  }
  writeFallbackQueue([]);
};

const generateId = (dedupeKey?: string): string => {
  if (dedupeKey) return `dedupe:${dedupeKey}`;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const shouldRetryStatus = (status: number): boolean => {
  if (status === 0) return true;
  if (status >= 500) return true;
  return status === 408 || status === 425 || status === 429;
};

const isOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

export const sendWithOfflineQueue = async (
  request: OfflineSubmissionRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<SendWithOfflineQueueResult> => {
  const method = request.method ?? 'POST';
  const headers = normalizeHeaders(request.headers);
  let bodyString: string;
  try {
    bodyString = serializeBody(request.body);
  } catch (error) {
    return Promise.reject(error);
  }

  const submission: StoredSubmission = {
    id: generateId(request.dedupeKey),
    url: request.url,
    method,
    headers,
    body: bodyString,
    checksum: computeChecksum(bodyString),
    createdAt: Date.now(),
    attempts: 0,
    dedupeKey: request.dedupeKey,
  };

  if (!isOffline()) {
    try {
      const response = await fetchImpl(request.url, {
        method,
        headers,
        body: bodyString || undefined,
      });
      if (response.ok) {
        return { status: 'sent', response };
      }
      if (!shouldRetryStatus(response.status)) {
        return { status: 'sent', response };
      }
      submission.attempts = 1;
      submission.lastError = `http_${response.status}`;
    } catch (error) {
      submission.lastError = error instanceof Error ? error.message : 'network_error';
    }
  } else {
    submission.lastError = 'offline';
  }

  await putEntry(submission);
  return { status: 'queued', reason: submission.lastError ?? 'queued' };
};

export const flushPendingSubmissions = async (
  fetchImpl: typeof fetch = fetch,
): Promise<void> => {
  const entries = await getAllEntries();
  for (const entry of entries) {
    if (isOffline()) break;
    let shouldRemove = false;
    try {
      const response = await fetchImpl(entry.url, {
        method: entry.method,
        headers: entry.headers,
        body: entry.body || undefined,
      });
      if (response.ok || !shouldRetryStatus(response.status)) {
        shouldRemove = true;
      } else {
        entry.attempts += 1;
        entry.lastError = `http_${response.status}`;
      }
    } catch (error) {
      entry.attempts += 1;
      entry.lastError = error instanceof Error ? error.message : 'network_error';
    }

    if (shouldRemove || entry.attempts >= MAX_ATTEMPTS) {
      await removeEntry(entry.id);
    } else {
      await putEntry(entry);
    }
  }
};

export const initializeOfflineQueue = (
  fetchImpl: typeof fetch = fetch,
): (() => void) | undefined => {
  if (!isBrowser || queueInitialized) return undefined;
  queueInitialized = true;

  const flush = () => {
    if (!isOffline()) {
      void flushPendingSubmissions(fetchImpl);
    }
  };

  const onlineHandler = () => flush();
  window.addEventListener('online', onlineHandler);

  let visibilityHandler: (() => void) | undefined;
  if (typeof document !== 'undefined') {
    visibilityHandler = () => {
      if (!document.hidden) {
        flush();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  }

  let intervalId: number | undefined;
  const startInterval = () => {
    if (intervalId) window.clearInterval(intervalId);
    intervalId = window.setInterval(() => {
      if (!isOffline()) {
        void flushPendingSubmissions(fetchImpl);
      }
    }, 5 * 60 * 1000);
  };

  startInterval();
  flush();

  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.ready
      .then((registration) => {
        const periodicSync = (
          registration as ServiceWorkerRegistration & {
            periodicSync?: {
              register: (tag: string, options: { minInterval: number }) => Promise<void>;
            };
          }
        ).periodicSync;
        if (periodicSync?.register) {
          return periodicSync.register('pending-submissions', {
            minInterval: 6 * 60 * 60 * 1000,
          });
        }
        return undefined;
      })
      .catch(() => {
        startInterval();
      });
  }

  return () => {
    window.removeEventListener('online', onlineHandler);
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
    }
    if (intervalId) {
      window.clearInterval(intervalId);
    }
    queueInitialized = false;
  };
};

export const __offlineQueue = {
  getAll: getAllEntries,
  clear: clearEntries,
};
