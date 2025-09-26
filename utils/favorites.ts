import { safeLocalStorage } from './safeStorage';

const FAVORITES_KEY = 'kali-favorites';
const LEGACY_KEY = 'pinnedApps';
export const FAVORITES_EVENT = 'kali-favorites-updated';

type FavoriteId = string;

const isStringArray = (value: unknown): value is FavoriteId[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string');

const parseStoredIds = (raw: string | null): FavoriteId[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return isStringArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const dispatchUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(FAVORITES_EVENT));
};

const writeIds = (ids: FavoriteId[]) => {
  if (!safeLocalStorage) return;
  const payload = JSON.stringify(ids);
  safeLocalStorage.setItem(FAVORITES_KEY, payload);
  safeLocalStorage.setItem(LEGACY_KEY, payload);
};

export const readFavoriteIds = (): FavoriteId[] => {
  const primary = parseStoredIds(safeLocalStorage?.getItem(FAVORITES_KEY) || null);
  if (primary.length > 0) {
    if (safeLocalStorage) {
      safeLocalStorage.setItem(FAVORITES_KEY, JSON.stringify(primary));
      safeLocalStorage.setItem(LEGACY_KEY, JSON.stringify(primary));
    }
    return primary;
  }
  const legacy = parseStoredIds(safeLocalStorage?.getItem(LEGACY_KEY) || null);
  if (legacy.length > 0 && safeLocalStorage) {
    safeLocalStorage.setItem(FAVORITES_KEY, JSON.stringify(legacy));
    safeLocalStorage.setItem(LEGACY_KEY, JSON.stringify(legacy));
  }
  return legacy;
};

export const setFavoriteIds = (ids: FavoriteId[]) => {
  if (!safeLocalStorage) return;
  const unique = Array.from(new Set(ids.filter(id => typeof id === 'string')));
  writeIds(unique);
  dispatchUpdate();
};

export const addFavoriteId = (id: FavoriteId) => {
  if (!safeLocalStorage) return;
  const ids = readFavoriteIds();
  if (ids.includes(id)) {
    dispatchUpdate();
    return;
  }
  ids.push(id);
  writeIds(ids);
  dispatchUpdate();
};

export const removeFavoriteId = (id: FavoriteId) => {
  if (!safeLocalStorage) return;
  const ids = readFavoriteIds().filter(existingId => existingId !== id);
  writeIds(ids);
  dispatchUpdate();
};

export const subscribeToFavoriteChanges = (callback: () => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  const storageHandler = (event: StorageEvent) => {
    if (!event.key || event.key === FAVORITES_KEY || event.key === LEGACY_KEY) {
      callback();
    }
  };
  window.addEventListener(FAVORITES_EVENT, handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener(FAVORITES_EVENT, handler);
    window.removeEventListener('storage', storageHandler);
  };
};
