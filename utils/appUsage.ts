import { safeLocalStorage } from './safeStorage';

export interface AppUsageEntry {
  id: string;
  count: number;
  lastOpened: number;
}

export const APP_USAGE_STORAGE_KEY = 'desktop:app-usage';
export const MAX_USAGE_ENTRIES = 40;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeEntry = (value: unknown): AppUsageEntry | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const maybeId = (value as { id?: unknown }).id;
  const maybeCount = (value as { count?: unknown }).count;
  const maybeLastOpened = (value as { lastOpened?: unknown }).lastOpened;

  if (typeof maybeId !== 'string') {
    return null;
  }

  const count = Number(maybeCount);
  const lastOpened = Number(maybeLastOpened);

  if (!isFiniteNumber(count) || !isFiniteNumber(lastOpened)) {
    return null;
  }

  return {
    id: maybeId,
    count,
    lastOpened,
  };
};

const sortUsage = (entries: AppUsageEntry[]): AppUsageEntry[] =>
  [...entries].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return b.lastOpened - a.lastOpened;
  });

export const normalizeAppUsageEntries = (
  value: unknown
): AppUsageEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((entry) => sanitizeEntry(entry))
    .filter((entry): entry is AppUsageEntry => Boolean(entry));

  const deduped: AppUsageEntry[] = [];
  const seen = new Set<string>();

  sortUsage(normalized).some((entry) => {
    if (seen.has(entry.id)) {
      return false;
    }
    seen.add(entry.id);
    deduped.push(entry);
    return deduped.length >= MAX_USAGE_ENTRIES;
  });

  return deduped;
};

export const loadAppUsage = (): AppUsageEntry[] => {
  if (!safeLocalStorage) {
    return [];
  }
  try {
    const raw = safeLocalStorage.getItem(APP_USAGE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return normalizeAppUsageEntries(parsed);
  } catch {
    return [];
  }
};

export const persistAppUsage = (entries: AppUsageEntry[]): void => {
  if (!safeLocalStorage) {
    return;
  }
  try {
    const normalized = normalizeAppUsageEntries(entries);
    safeLocalStorage.setItem(
      APP_USAGE_STORAGE_KEY,
      JSON.stringify(normalized)
    );
  } catch {
    // Ignore persistence errors (quota, private mode, etc.)
  }
};

export const updateAppUsage = (
  entries: AppUsageEntry[] | undefined,
  id: string,
  timestamp: number = Date.now()
): AppUsageEntry[] => {
  if (!id) {
    return Array.isArray(entries) ? [...entries] : [];
  }

  const base = normalizeAppUsageEntries(entries);
  const existing = base.find((entry) => entry.id === id);
  const filtered = base.filter((entry) => entry.id !== id);

  const updatedEntry: AppUsageEntry = {
    id,
    count: (existing?.count ?? 0) + 1,
    lastOpened: timestamp,
  };

  const combined = sortUsage([updatedEntry, ...filtered]);
  return combined.slice(0, MAX_USAGE_ENTRIES);
};

export const getTopAppIds = (
  entries: AppUsageEntry[] | undefined,
  limit = 10
): string[] => {
  if (!Array.isArray(entries) || limit <= 0) {
    return [];
  }
  return entries.slice(0, limit).map((entry) => entry.id);
};

