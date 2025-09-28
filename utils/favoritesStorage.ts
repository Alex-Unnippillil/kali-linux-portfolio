import { safeLocalStorage } from './safeStorage';

export const FAVORITES_STORAGE_KEY = 'kali-favorites';
const LEGACY_FAVORITES_STORAGE_KEY = 'pinnedApps';
export const FAVORITES_CHANGED_EVENT = 'kali-favorites-changed';

type FavoritesState = {
  ids: string[];
  hasStoredValue: boolean;
};

const sanitizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  value.forEach((entry) => {
    if (typeof entry !== 'string') return;
    if (seen.has(entry)) return;
    seen.add(entry);
    result.push(entry);
  });
  return result;
};

const readIdsFromKey = (key: string): { ids: string[]; exists: boolean } => {
  if (!safeLocalStorage) {
    return { ids: [], exists: false };
  }
  const raw = safeLocalStorage.getItem(key);
  if (raw === null) {
    return { ids: [], exists: false };
  }
  try {
    const parsed = JSON.parse(raw);
    return { ids: sanitizeIds(parsed), exists: true };
  } catch {
    return { ids: [], exists: true };
  }
};

export const getStoredFavoriteIds = (): FavoritesState => {
  const primary = readIdsFromKey(FAVORITES_STORAGE_KEY);
  if (primary.exists) {
    return { ids: primary.ids, hasStoredValue: true };
  }
  const legacy = readIdsFromKey(LEGACY_FAVORITES_STORAGE_KEY);
  if (legacy.exists) {
    if (safeLocalStorage) {
      try {
        safeLocalStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(legacy.ids));
      } catch {
        // ignore quota or serialization errors
      }
    }
    return { ids: legacy.ids, hasStoredValue: true };
  }
  return { ids: [], hasStoredValue: false };
};

const dispatchFavoritesChanged = (ids: string[]) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FAVORITES_CHANGED_EVENT, { detail: ids }));
};

export const setStoredFavoriteIds = (ids: readonly string[]): string[] => {
  const sanitized = sanitizeIds(ids);
  if (!safeLocalStorage) {
    return sanitized;
  }
  const serialized = JSON.stringify(sanitized);
  try {
    safeLocalStorage.setItem(FAVORITES_STORAGE_KEY, serialized);
    safeLocalStorage.setItem(LEGACY_FAVORITES_STORAGE_KEY, serialized);
  } catch {
    // ignore storage errors (quota, etc.)
  }
  dispatchFavoritesChanged(sanitized);
  return sanitized;
};

export const updateStoredFavoriteIds = (
  updater: (current: string[]) => readonly string[],
): string[] => {
  const { ids } = getStoredFavoriteIds();
  const next = updater([...ids]);
  return setStoredFavoriteIds(next);
};
