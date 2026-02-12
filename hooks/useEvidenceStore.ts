'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { DBSchema, IDBPDatabase } from 'idb';
import { getDb } from '../utils/safeIDB';
import { hasIndexedDB } from '../utils/isBrowser';

const DB_NAME = 'kali-evidence';
const DB_VERSION = 1;
const STORE_NAME = 'captures';
export const EVIDENCE_EXPORT_VERSION = 1;

type OptionalString = string | null | undefined;

export type EvidenceTimestamps = Record<string, string | undefined>;

export interface EvidenceCapture {
  id: string;
  type: string;
  path: string;
  hash: string;
  timestamps: EvidenceTimestamps;
  tags: string[];
  target?: string;
  ticket?: string;
}

export type EvidenceCaptureInput = {
  id: string;
  type: string;
  path: string;
  hash: string;
  timestamps?: EvidenceTimestamps;
  tags?: string[];
  target?: OptionalString;
  ticket?: OptionalString;
};

export type EvidenceCaptureUpdate = Partial<
  Omit<EvidenceCaptureInput, 'id'>
>;

export interface EvidenceExportPayload {
  version: number;
  exportedAt: string;
  captures: EvidenceCapture[];
}

export interface EvidenceExportOptions {
  pretty?: boolean;
}

export interface EvidenceImportOptions {
  merge?: boolean;
  overwriteExisting?: boolean;
}

export interface EvidenceImportResult {
  imported: number;
  skipped: number;
}

interface EvidenceDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: EvidenceCapture;
  };
}

const noopAsync = async () => {};
const noopAsyncBoolean = async () => false;
const noopAsyncCapture = async () => null;
const noopAsyncResult = async () => ({ imported: 0, skipped: 0 });

export interface EvidenceStoreContextValue {
  supported: boolean;
  ready: boolean;
  captures: EvidenceCapture[];
  refresh: () => Promise<void>;
  addCapture: (capture: EvidenceCaptureInput) => Promise<EvidenceCapture | null>;
  updateCapture: (
    id: string,
    updates: EvidenceCaptureUpdate,
  ) => Promise<EvidenceCapture | null>;
  removeCapture: (id: string) => Promise<boolean>;
  clear: () => Promise<void>;
  getCapture: (id: string) => Promise<EvidenceCapture | null>;
  exportEvidence: (options?: EvidenceExportOptions) => Promise<string>;
  buildExportPayload: () => Promise<EvidenceExportPayload>;
  importEvidence: (
    payload: EvidenceExportPayload,
    options?: EvidenceImportOptions,
  ) => Promise<EvidenceImportResult>;
}

export const EvidenceStoreContext = createContext<EvidenceStoreContextValue>({
  supported: false,
  ready: false,
  captures: [],
  refresh: noopAsync,
  addCapture: noopAsyncCapture,
  updateCapture: noopAsyncCapture,
  removeCapture: noopAsyncBoolean,
  clear: noopAsync,
  getCapture: noopAsyncCapture,
  exportEvidence: async () =>
    serializeEvidenceExport(
      { version: EVIDENCE_EXPORT_VERSION, exportedAt: new Date().toISOString(), captures: [] },
      { pretty: true },
    ),
  buildExportPayload: async () => ({
    version: EVIDENCE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    captures: [],
  }),
  importEvidence: noopAsyncResult,
});

type EvidenceStoreProviderProps = {
  children: ReactNode;
};

const upgradeDb: Parameters<typeof getDb>[2] = (db) => {
  if (!db.objectStoreNames.contains(STORE_NAME)) {
    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
  }
};

function ensureString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Evidence capture ${field} must be a non-empty string`);
  }
  return value;
}

function toOptionalString(value: OptionalString): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function sanitizeTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  tags.forEach((tag) => {
    if (typeof tag !== 'string') return;
    const trimmed = tag.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    result.push(trimmed);
  });
  return result;
}

function sanitizeTimestamps(
  timestamps: EvidenceTimestamps | undefined,
  fallback: string,
  { updateUpdatedAt }: { updateUpdatedAt: boolean },
): EvidenceTimestamps {
  const sanitized: EvidenceTimestamps = {};
  if (timestamps) {
    Object.entries(timestamps).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        sanitized[key] = value;
      }
    });
  }
  if (!sanitized.createdAt) sanitized.createdAt = fallback;
  if (updateUpdatedAt) {
    sanitized.updatedAt = fallback;
  } else if (!sanitized.updatedAt) {
    sanitized.updatedAt = sanitized.createdAt;
  }
  return sanitized;
}

function sortCaptures(list: EvidenceCapture[]): EvidenceCapture[] {
  return [...list].sort((a, b) => {
    const aTime = a.timestamps?.updatedAt || a.timestamps?.createdAt || '';
    const bTime = b.timestamps?.updatedAt || b.timestamps?.createdAt || '';
    return bTime.localeCompare(aTime);
  });
}

function buildCapture(
  base: EvidenceCaptureInput,
  { fallbackTimestamp, updateUpdatedAt }: { fallbackTimestamp: string; updateUpdatedAt: boolean },
): EvidenceCapture {
  const capture: EvidenceCapture = {
    id: ensureString(base.id, 'id'),
    type: ensureString(base.type, 'type'),
    path: ensureString(base.path, 'path'),
    hash: ensureString(base.hash, 'hash'),
    timestamps: sanitizeTimestamps(base.timestamps, fallbackTimestamp, {
      updateUpdatedAt,
    }),
    tags: sanitizeTags(base.tags),
  };
  const target = toOptionalString(base.target);
  if (target) capture.target = target;
  const ticket = toOptionalString(base.ticket);
  if (ticket) capture.ticket = ticket;
  return capture;
}

function mergeCapture(
  existing: EvidenceCapture,
  updates: EvidenceCaptureUpdate,
  now: string,
): EvidenceCapture {
  const next: EvidenceCapture = {
    ...existing,
  };

  if (updates.type !== undefined) {
    next.type = ensureString(updates.type, 'type');
  }
  if (updates.path !== undefined) {
    next.path = ensureString(updates.path, 'path');
  }
  if (updates.hash !== undefined) {
    next.hash = ensureString(updates.hash, 'hash');
  }
  if (updates.tags !== undefined) {
    next.tags = sanitizeTags(updates.tags);
  }
  if (updates.timestamps !== undefined) {
    next.timestamps = sanitizeTimestamps(
      { ...existing.timestamps, ...updates.timestamps },
      now,
      { updateUpdatedAt: true },
    );
  } else {
    next.timestamps = sanitizeTimestamps(existing.timestamps, now, {
      updateUpdatedAt: true,
    });
  }

  if (updates.target !== undefined) {
    const target = toOptionalString(updates.target);
    if (target) next.target = target;
    else delete next.target;
  }

  if (updates.ticket !== undefined) {
    const ticket = toOptionalString(updates.ticket);
    if (ticket) next.ticket = ticket;
    else delete next.ticket;
  }

  return next;
}

function normalizeStoredCapture(record: EvidenceCapture): EvidenceCapture {
  const fallback = record.timestamps?.createdAt || record.timestamps?.updatedAt || new Date().toISOString();
  const timestamps = sanitizeTimestamps(record.timestamps, fallback, { updateUpdatedAt: false });
  const tags = sanitizeTags(record.tags);
  const target = toOptionalString(record.target);
  const ticket = toOptionalString(record.ticket);
  const normalized: EvidenceCapture = {
    ...record,
    timestamps,
    tags,
  };
  if (target) normalized.target = target;
  else delete normalized.target;
  if (ticket) normalized.ticket = ticket;
  else delete normalized.ticket;
  return normalized;
}

export function serializeEvidenceExport(
  payload: EvidenceExportPayload,
  options: EvidenceExportOptions = {},
): string {
  return JSON.stringify(payload, null, options.pretty ? 2 : 0);
}

export function parseEvidenceExport(serialized: string): EvidenceExportPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(serialized);
  } catch (error) {
    throw new Error('Failed to parse evidence export JSON');
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Evidence export payload must be an object');
  }

  const { version, exportedAt, captures } = raw as Partial<EvidenceExportPayload>;
  if (typeof version !== 'number') {
    throw new Error('Evidence export is missing a numeric version');
  }
  if (typeof exportedAt !== 'string') {
    throw new Error('Evidence export is missing the exportedAt timestamp');
  }
  if (!Array.isArray(captures)) {
    throw new Error('Evidence export is missing the captures array');
  }

  const sanitizedCaptures = captures.map((capture) =>
    buildCapture(
      capture as EvidenceCaptureInput,
      { fallbackTimestamp: exportedAt, updateUpdatedAt: false },
    ),
  );

  return {
    version,
    exportedAt,
    captures: sanitizedCaptures,
  };
}

export function EvidenceStoreProvider({ children }: EvidenceStoreProviderProps) {
  const supported = hasIndexedDB;
  const [ready, setReady] = useState(!supported);
  const [captures, setCaptures] = useState<EvidenceCapture[]>([]);
  const capturesRef = useRef<EvidenceCapture[]>([]);

  useEffect(() => {
    capturesRef.current = captures;
  }, [captures]);

  const dbPromiseRef = useRef<Promise<IDBPDatabase<EvidenceDB>> | null>(null);

  const getDbInstance = useCallback(async () => {
    if (!supported) return null;
    if (!dbPromiseRef.current) {
      const dbPromise = getDb(DB_NAME, DB_VERSION, upgradeDb);
      if (!dbPromise) return null;
      dbPromiseRef.current = dbPromise as Promise<IDBPDatabase<EvidenceDB>>;
    }
    try {
      return await dbPromiseRef.current;
    } catch (error) {
      console.warn('Failed to open evidence store', error);
      dbPromiseRef.current = null;
      return null;
    }
  }, [supported]);

  const refresh = useCallback(async () => {
    const db = await getDbInstance();
    if (!db) return;
    try {
      const items = await db.getAll(STORE_NAME);
      setCaptures(sortCaptures(items.map(normalizeStoredCapture)));
    } catch (error) {
      console.warn('Failed to load evidence captures', error);
    }
  }, [getDbInstance]);

  useEffect(() => {
    let cancelled = false;
    if (!supported) {
      setReady(true);
      return;
    }
    (async () => {
      const db = await getDbInstance();
      if (!db || cancelled) {
        setReady(true);
        return;
      }
      try {
        const items = await db.getAll(STORE_NAME);
        if (!cancelled) {
          setCaptures(sortCaptures(items.map(normalizeStoredCapture)));
        }
      } catch (error) {
        console.warn('Failed to initialize evidence store', error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported, getDbInstance]);

  const addCapture = useCallback(
    async (capture: EvidenceCaptureInput) => {
      const now = new Date().toISOString();
      let record: EvidenceCapture;
      try {
        record = buildCapture(capture, {
          fallbackTimestamp: now,
          updateUpdatedAt: true,
        });
      } catch (error) {
        console.warn('Invalid capture payload', error);
        return null;
      }
      setCaptures((prev) => sortCaptures([...prev.filter((item) => item.id !== record.id), record]));
      const db = await getDbInstance();
      if (db) {
        try {
          await db.put(STORE_NAME, record);
        } catch (error) {
          console.warn('Failed to persist capture', error);
        }
      }
      return record;
    },
    [getDbInstance],
  );

  const updateCapture = useCallback(
    async (id: string, updates: EvidenceCaptureUpdate) => {
      const now = new Date().toISOString();
      const db = await getDbInstance();
      let existing: EvidenceCapture | undefined;
      if (db) {
        try {
          const record = await db.get(STORE_NAME, id);
          if (record) existing = normalizeStoredCapture(record);
        } catch (error) {
          console.warn('Failed to read capture before update', error);
        }
      }
      if (!existing) {
        existing = capturesRef.current.find((item) => item.id === id);
      }
      if (!existing) return null;

      let record: EvidenceCapture;
      try {
        record = mergeCapture(existing, updates, now);
      } catch (error) {
        console.warn('Invalid capture update', error);
        return null;
      }

      setCaptures((prev) =>
        sortCaptures(prev.map((item) => (item.id === id ? record : item))),
      );

      if (db) {
        try {
          await db.put(STORE_NAME, record);
        } catch (error) {
          console.warn('Failed to persist capture update', error);
        }
      }

      return record;
    },
    [getDbInstance],
  );

  const removeCapture = useCallback(
    async (id: string) => {
      setCaptures((prev) => prev.filter((item) => item.id !== id));
      const db = await getDbInstance();
      if (db) {
        try {
          await db.delete(STORE_NAME, id);
        } catch (error) {
          console.warn('Failed to remove capture', error);
          return false;
        }
      }
      return true;
    },
    [getDbInstance],
  );

  const clear = useCallback(async () => {
    setCaptures([]);
    const db = await getDbInstance();
    if (db) {
      try {
        await db.clear(STORE_NAME);
      } catch (error) {
        console.warn('Failed to clear evidence store', error);
      }
    }
  }, [getDbInstance]);

  const getCapture = useCallback(
    async (id: string) => {
      const fromState = capturesRef.current.find((item) => item.id === id);
      if (fromState) return fromState;
      const db = await getDbInstance();
      if (!db) return null;
      try {
        const record = await db.get(STORE_NAME, id);
        return record ? normalizeStoredCapture(record) : null;
      } catch (error) {
        console.warn('Failed to fetch capture', error);
        return null;
      }
    },
    [getDbInstance],
  );

  const buildExportPayload = useCallback(async () => {
    const db = await getDbInstance();
    const snapshot = db
      ? await db.getAll(STORE_NAME)
      : capturesRef.current;
    return {
      version: EVIDENCE_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      captures: sortCaptures(snapshot.map(normalizeStoredCapture)),
    };
  }, [getDbInstance]);

  const exportEvidence = useCallback(
    async (options?: EvidenceExportOptions) => {
      const payload = await buildExportPayload();
      return serializeEvidenceExport(payload, options);
    },
    [buildExportPayload],
  );

  const importEvidence = useCallback(
    async (
      payload: EvidenceExportPayload,
      options: EvidenceImportOptions = {},
    ) => {
      const db = await getDbInstance();
      if (!db) {
        // fall back to in-memory merge
        const merged = options.merge !== false ? capturesRef.current.slice() : [];
        let imported = 0;
        payload.captures.forEach((capture) => {
          const normalized = buildCapture(capture, {
            fallbackTimestamp: payload.exportedAt,
            updateUpdatedAt: false,
          });
          const index = merged.findIndex((item) => item.id === normalized.id);
          if (index >= 0) {
            if (options.overwriteExisting === false) return;
            merged[index] = normalized;
          } else {
            merged.push(normalized);
          }
          imported += 1;
        });
        setCaptures(sortCaptures(merged));
        return { imported, skipped: payload.captures.length - imported };
      }

      const { merge = true, overwriteExisting = true } = options;
      let imported = 0;
      let skipped = 0;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.store;
      if (!merge) {
        await store.clear();
      }
      for (const raw of payload.captures) {
        let normalized: EvidenceCapture;
        try {
          normalized = buildCapture(raw, {
            fallbackTimestamp: payload.exportedAt,
            updateUpdatedAt: false,
          });
        } catch (error) {
          console.warn('Skipping invalid capture from import', error);
          skipped += 1;
          continue;
        }
        if (merge && !overwriteExisting) {
          const existing = await store.get(normalized.id);
          if (existing) {
            skipped += 1;
            continue;
          }
        }
        await store.put(normalized);
        imported += 1;
      }
      await tx.done;
      await refresh();
      return { imported, skipped };
    },
    [getDbInstance, refresh],
  );

  const value = useMemo<EvidenceStoreContextValue>(
    () => ({
      supported,
      ready,
      captures,
      refresh,
      addCapture,
      updateCapture,
      removeCapture,
      clear,
      getCapture,
      exportEvidence,
      buildExportPayload,
      importEvidence,
    }),
    [
      supported,
      ready,
      captures,
      refresh,
      addCapture,
      updateCapture,
      removeCapture,
      clear,
      getCapture,
      exportEvidence,
      buildExportPayload,
      importEvidence,
    ],
  );

  return (
    <EvidenceStoreContext.Provider value={value}>
      {children}
    </EvidenceStoreContext.Provider>
  );
}

export function useEvidenceStore() {
  return useContext(EvidenceStoreContext);
}

export default useEvidenceStore;
