import { normalizePath } from '../../modules/filesystem/metadata';

export type DlpStoredAction = 'move' | 'copy';

export interface StoredDlpDecision {
  key: string;
  sources: string[];
  destination: string;
  action: DlpStoredAction;
  updatedAt: number;
}

const STORAGE_KEY = 'dlp:decisions';

type DecisionStore = Record<string, StoredDlpDecision>;

const getStorage = (): Storage | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
};

const readStore = (): DecisionStore => {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DecisionStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeStore = (store: DecisionStore): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const createKeyData = (sources: string[], destination: string) => {
  const normalizedSources = sources.map(normalizePath).sort();
  const normalizedDestination = normalizePath(destination);
  return {
    key: `${normalizedSources.join(',')}->${normalizedDestination}`,
    normalizedSources,
    normalizedDestination,
  };
};

export const getStoredDecision = (
  sources: string[],
  destination: string
): StoredDlpDecision | null => {
  const { key } = createKeyData(sources, destination);
  const store = readStore();
  const entry = store[key];
  return entry ? { ...entry } : null;
};

export const setStoredDecision = (
  sources: string[],
  destination: string,
  action: DlpStoredAction
): StoredDlpDecision | null => {
  const { key, normalizedSources, normalizedDestination } = createKeyData(
    sources,
    destination
  );
  const entry: StoredDlpDecision = {
    key,
    sources: normalizedSources,
    destination: normalizedDestination,
    action,
    updatedAt: Date.now(),
  };
  const store = readStore();
  store[key] = entry;
  writeStore(store);
  return { ...entry };
};

export const clearStoredDecision = (
  sources: string[],
  destination: string
): void => {
  const { key } = createKeyData(sources, destination);
  const store = readStore();
  if (!store[key]) return;
  delete store[key];
  writeStore(store);
};

export const clearAllDecisions = (): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
};

export const listStoredDecisions = (): StoredDlpDecision[] =>
  Object.values(readStore());
