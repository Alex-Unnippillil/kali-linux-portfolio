import { hasStorage } from './env';

export const safeLocalStorage: Storage | undefined =
  hasStorage ? localStorage : undefined;

const readJSON = <T>(key: string, fallback: T): T => {
  if (!safeLocalStorage) return fallback;
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJSON = (key: string, value: unknown): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota or serialization issues
  }
};

const removeKey = (key: string): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(key);
  } catch {
    // ignore storage access errors
  }
};

const SEARCH_FILE_KEY = 'search:file-index';
const SEARCH_SUMMARY_KEY = 'search:summaries';
const SEARCH_INDEX_PREF_KEY = 'search:indexing-enabled';
const SUMMARY_MAX_LENGTH = 280;

export type StoredFileMetadata = {
  path: string;
  name: string;
  extension: string | null;
  modified: number | null;
  kind?: 'file' | 'directory';
};

export type StoredSummary = {
  id: string;
  title: string;
  summary: string;
  updatedAt: number;
  kind: 'session' | 'workspace';
};

export const readStoredFileIndex = (): StoredFileMetadata[] =>
  readJSON<StoredFileMetadata[]>(SEARCH_FILE_KEY, []);

export const writeStoredFileIndex = (entries: StoredFileMetadata[]): void =>
  writeJSON(SEARCH_FILE_KEY, entries);

export const clearStoredFileIndex = (): void => removeKey(SEARCH_FILE_KEY);

export const readStoredSummaries = (): StoredSummary[] =>
  readJSON<StoredSummary[]>(SEARCH_SUMMARY_KEY, []);

export const writeStoredSummaries = (entries: StoredSummary[]): void =>
  writeJSON(SEARCH_SUMMARY_KEY, entries);

export const clearStoredSummaries = (): void => removeKey(SEARCH_SUMMARY_KEY);

export const sanitizeSummary = (value: string): string =>
  value.replace(/\s+/g, ' ').trim().slice(0, SUMMARY_MAX_LENGTH);

export const getIndexingPreference = (): boolean => {
  if (!safeLocalStorage) return true;
  try {
    const raw = safeLocalStorage.getItem(SEARCH_INDEX_PREF_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
};

export const setIndexingPreference = (enabled: boolean): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(SEARCH_INDEX_PREF_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore storage write failures
  }
};
