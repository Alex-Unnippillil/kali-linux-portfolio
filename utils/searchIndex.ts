'use client';

import {
  StoredFileMetadata,
  StoredSummary,
  clearStoredFileIndex,
  clearStoredSummaries,
  getIndexingPreference,
  readStoredFileIndex,
  readStoredSummaries,
  sanitizeSummary,
  setIndexingPreference,
  writeStoredFileIndex,
  writeStoredSummaries,
} from './safeStorage';

declare global {
  interface Window {
    __searchIndexListenerInstalled?: boolean;
  }
}

type RuntimeWindow = Window & typeof globalThis & {
  __searchIndexListenerInstalled?: boolean;
};

const getRuntimeWindow = (): RuntimeWindow | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = globalThis as Partial<RuntimeWindow>;
  if (typeof candidate.addEventListener === 'function') {
    return candidate as RuntimeWindow;
  }
  if (candidate.window && typeof candidate.window.addEventListener === 'function') {
    return candidate.window as RuntimeWindow;
  }
  return undefined;
};

export type FileMetadataPayload = {
  path: string;
  name: string;
  extension?: string | null;
  modified?: number | null;
  kind?: 'file' | 'directory';
};

export type SummaryPayload = {
  id: string;
  title: string;
  summary: string;
  updatedAt?: number;
  kind: 'session' | 'workspace';
};

export type SearchIndexEntry = {
  id: string;
  title: string;
  subtitle?: string;
  path?: string;
  extension?: string | null;
  modified?: number | null;
  summary?: string;
  source: 'file' | 'directory' | 'session' | 'workspace';
  updatedAt?: number;
};

const FILE_ENTRY_LIMIT = 200;
const SUMMARY_ENTRY_LIMIT = 50;

const listeners = new Set<(entries: SearchIndexEntry[]) => void>();

const runtimeWindow = getRuntimeWindow();

let indexingEnabled = runtimeWindow ? getIndexingPreference() : false;

let fileRecords: StoredFileMetadata[] = runtimeWindow
  ? readStoredFileIndex()
  : [];

let summaryRecords: StoredSummary[] = runtimeWindow
  ? readStoredSummaries()
  : [];

const normalisePath = (value: string): string =>
  value.replace(/\\/g, '/').replace(/\/+/g, '/');

const buildEntries = (): SearchIndexEntry[] => {
  const files: SearchIndexEntry[] = fileRecords.map((record) => ({
    id: `file:${record.path}`,
    title: record.name,
    subtitle: record.path,
    path: record.path,
    extension: record.extension ?? undefined,
    modified: record.modified ?? undefined,
    source: (record.kind ?? 'file') as 'file' | 'directory',
    updatedAt: record.modified ?? undefined,
  }));

  const summaries: SearchIndexEntry[] = summaryRecords.map((record) => ({
    id: `${record.kind}:${record.id}`,
    title: record.title,
    summary: record.summary,
    source: record.kind,
    updatedAt: record.updatedAt,
  }));

  return [...files, ...summaries].sort((a, b) => {
    const aTime = a.updatedAt ?? 0;
    const bTime = b.updatedAt ?? 0;
    return bTime - aTime;
  });
};

const notify = (): void => {
  const entries = buildEntries();
  listeners.forEach((listener) => {
    try {
      listener(entries);
    } catch (err) {
      // Surface listener errors without breaking others
      console.error('searchIndex listener error', err);
    }
  });
};

const normaliseFilePayload = (
  entry: FileMetadataPayload,
): StoredFileMetadata | null => {
  const name = typeof entry.name === 'string' ? entry.name.trim() : '';
  const path = typeof entry.path === 'string' ? entry.path.trim() : '';
  if (!name || !path) return null;

  const extension = entry.extension
    ? entry.extension.replace(/^\./, '').toLowerCase()
    : null;
  const modified =
    typeof entry.modified === 'number' && Number.isFinite(entry.modified)
      ? entry.modified
      : null;
  const kind = entry.kind === 'directory' ? 'directory' : 'file';

  return {
    name,
    path: normalisePath(path),
    extension,
    modified,
    kind,
  };
};

export const addFileMetadata = (entries: FileMetadataPayload[]): void => {
  if (!indexingEnabled || !entries.length) return;

  const byPath = new Map<string, StoredFileMetadata>();
  fileRecords.forEach((record) => byPath.set(record.path, record));

  entries.forEach((entry) => {
    const normalised = normaliseFilePayload(entry);
    if (!normalised) return;
    byPath.set(normalised.path, normalised);
  });

  fileRecords = Array.from(byPath.values())
    .sort((a, b) => (b.modified ?? 0) - (a.modified ?? 0))
    .slice(0, FILE_ENTRY_LIMIT);

  writeStoredFileIndex(fileRecords);
  notify();
};

const clearFileRecords = (): void => {
  fileRecords = [];
  clearStoredFileIndex();
};

const clearSummaryRecords = (): void => {
  summaryRecords = [];
  clearStoredSummaries();
};

export const clearAll = (): void => {
  clearFileRecords();
  clearSummaryRecords();
  notify();
};

export const recordSummary = (payload: SummaryPayload): void => {
  if (!indexingEnabled) return;

  const { id, title, kind } = payload;
  if (!id || !title) return;

  const cleaned: StoredSummary = {
    id,
    title,
    summary: sanitizeSummary(payload.summary || ''),
    updatedAt: payload.updatedAt ?? Date.now(),
    kind,
  };

  const byId = new Map<string, StoredSummary>();
  summaryRecords.forEach((record) =>
    byId.set(`${record.kind}:${record.id}`, record),
  );
  byId.set(`${cleaned.kind}:${cleaned.id}`, cleaned);

  summaryRecords = Array.from(byId.values())
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, SUMMARY_ENTRY_LIMIT);

  writeStoredSummaries(summaryRecords);
  notify();
};

export const setEnabled = (enabled: boolean): void => {
  indexingEnabled = enabled;
  setIndexingPreference(enabled);
  if (!enabled) {
    clearAll();
    return;
  }
  // when re-enabled, reload persisted data so the index picks up previous state
  fileRecords = readStoredFileIndex();
  summaryRecords = readStoredSummaries();
  notify();
};

export const isEnabled = (): boolean => indexingEnabled;

export const getEntries = (): SearchIndexEntry[] => buildEntries();

export const search = (query: string): SearchIndexEntry[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return buildEntries()
    .filter((entry) => {
      const fields = [
        entry.title,
        entry.subtitle,
        entry.path,
        entry.summary,
        entry.extension ?? undefined,
      ];
      return fields.some((value) =>
        typeof value === 'string' ? value.toLowerCase().includes(q) : false,
      );
    })
    .slice(0, 20);
};

export const subscribe = (
  listener: (entries: SearchIndexEntry[]) => void,
): (() => void) => {
  listeners.add(listener);
  listener(buildEntries());
  return () => {
    listeners.delete(listener);
  };
};

const coerceMessageEntries = (entries: unknown): FileMetadataPayload[] => {
  if (!Array.isArray(entries)) return [];
  return entries
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const data = entry as Record<string, unknown>;
      const name = typeof data.name === 'string' ? data.name : '';
      const path = typeof data.path === 'string' ? data.path : name;
      if (!name || !path) return null;

      let modified: number | null = null;
      if (typeof data.modified === 'number' && Number.isFinite(data.modified)) {
        modified = data.modified;
      } else if (typeof data.modified === 'string') {
        const parsed = Date.parse(data.modified);
        modified = Number.isNaN(parsed) ? null : parsed;
      }

      const extension =
        typeof data.extension === 'string'
          ? data.extension.toLowerCase()
          : null;

      const kind = data.kind === 'directory' ? 'directory' : 'file';

      return {
        name,
        path,
        extension,
        modified,
        kind,
      } satisfies FileMetadataPayload;
    })
    .filter((value): value is FileMetadataPayload => Boolean(value));
};

const activeWindow = getRuntimeWindow();
if (activeWindow && !activeWindow.__searchIndexListenerInstalled) {
  const handleMessage = (event: MessageEvent) => {
    if (!indexingEnabled) return;
    if (event.origin && event.origin !== activeWindow.location.origin) return;

    const data = event.data as Record<string, unknown> | null;
    if (!data) return;

    if (data.type === 'search-index:index') {
      const payload = coerceMessageEntries(data.entries);
      if (payload.length) addFileMetadata(payload);
    } else if (data.type === 'search-index:purge') {
      clearFileRecords();
      notify();
    }
  };

  activeWindow.addEventListener('message', handleMessage);
  activeWindow.__searchIndexListenerInstalled = true;
}

const searchIndex = {
  addFileMetadata,
  clearAll,
  getEntries,
  isEnabled,
  recordSummary,
  search,
  setEnabled,
  subscribe,
};

export default searchIndex;
