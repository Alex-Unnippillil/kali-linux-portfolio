import { safeLocalStorage } from './safeStorage';

export const RECENT_STORAGE_KEY = 'kali-recent';
const LEGACY_RECENT_STORAGE_KEY = 'recentApps';
const MAX_RECENT_ENTRIES = 20;

type RecentId = string;

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

const emitRecentUpdate = (ids: RecentId[]): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<RecentId[]>('recent-apps-updated', { detail: ids }));
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

  return legacyIds;
};

export const readRecentAppIds = (): RecentId[] => {
  if (!safeLocalStorage) return [];
  const seeded = seedRecentAppsFromLegacy();
  if (seeded.length > 0 || safeLocalStorage.getItem(RECENT_STORAGE_KEY) !== null) {
    return seeded;
  }
  return [];
};

export const writeRecentAppIds = (ids: RecentId[]): void => {
  const normalized = ids
    .filter((id): id is RecentId => typeof id === 'string')
    .slice(0, MAX_RECENT_ENTRIES);
  if (!safeLocalStorage) {
    emitRecentUpdate(normalized);
    return;
  }
  try {
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore storage failures
  }
  emitRecentUpdate(normalized);
};

export const addRecentApp = (id: RecentId): RecentId[] => {
  if (!id) return [];

  const current = seedRecentAppsFromLegacy();
  const updated = [id, ...current.filter(existingId => existingId !== id)].slice(0, MAX_RECENT_ENTRIES);

  if (!safeLocalStorage) {
    emitRecentUpdate(updated);
    return updated;
  }

  try {
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage failures
  }

  emitRecentUpdate(updated);

  return updated;
};
