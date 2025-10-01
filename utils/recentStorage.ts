import { safeLocalStorage } from './safeStorage';

export const RECENT_STORAGE_KEY = 'kali-recent';
const LEGACY_RECENT_STORAGE_KEY = 'recentApps';
const MAX_RECENT_ENTRIES = 20;

export type RecentId = string;

export const RECENT_STORAGE_EVENT = 'recent-storage-change';

const dispatchRecentChange = (ids: RecentId[]) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(RECENT_STORAGE_EVENT, { detail: ids }));
};

const parseIds = (raw: string | null): RecentId[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is RecentId => typeof value === 'string');
  } catch {
    return [];
  }
};

export const seedRecentAppsFromLegacy = (): RecentId[] => {
  if (!safeLocalStorage) return [];
  const currentRaw = safeLocalStorage.getItem(RECENT_STORAGE_KEY);
  if (currentRaw !== null) {
    return parseIds(currentRaw);
  }

  const legacyRaw = safeLocalStorage.getItem(LEGACY_RECENT_STORAGE_KEY);
  if (legacyRaw === null) {
    return [];
  }

  const legacyIds = parseIds(legacyRaw).slice(0, MAX_RECENT_ENTRIES);

  try {
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(legacyIds));
    safeLocalStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
  } catch {
    // ignore storage failures (e.g., quota exceeded)
  }

  dispatchRecentChange(legacyIds);

  return legacyIds;
};

export const readRecentAppIds = (): RecentId[] => {
  if (!safeLocalStorage) return [];
  const seeded = seedRecentAppsFromLegacy();
  if (seeded.length > 0) {
    return seeded;
  }
  const stored = safeLocalStorage.getItem(RECENT_STORAGE_KEY);
  if (stored === null) return [];
  return parseIds(stored);
};

export const writeRecentAppIds = (ids: RecentId[]): void => {
  if (!safeLocalStorage) return;
  try {
    const sanitized = ids
      .filter((id): id is RecentId => typeof id === 'string')
      .slice(0, MAX_RECENT_ENTRIES);
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(sanitized));
    dispatchRecentChange(sanitized);
  } catch {
    // ignore storage failures
  }
};

export const addRecentApp = (id: RecentId): RecentId[] => {
  if (!safeLocalStorage || !id) return [];

  const current = seedRecentAppsFromLegacy();
  const updated = [id, ...current.filter(existingId => existingId !== id)].slice(0, MAX_RECENT_ENTRIES);

  try {
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
    dispatchRecentChange(updated);
  } catch {
    // ignore storage failures
  }

  return updated;
};

export const clearRecentApps = (): void => {
  writeRecentAppIds([]);
};
