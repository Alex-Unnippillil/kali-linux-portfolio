import { safeLocalStorage } from './safeStorage';

export const OPEN_APP_EVENT = 'open-app';
export const RECENT_APPS_KEY = 'recentApps';
export const RECENT_APPS_EVENT = 'recent-apps-updated';
export const FAVORITE_APPS_KEY = 'pinnedApps';
export const FAVORITE_APPS_EVENT = 'favorite-apps-updated';

const MAX_RECENT_APPS = 10;

const parseStoredIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is string => typeof id === 'string');
};

const readIds = (key: string): string[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return [];
    return parseStoredIds(JSON.parse(raw));
  } catch {
    return [];
  }
};

const writeIds = (key: string, ids: string[], eventName: string) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // ignore write errors
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail: ids }));
  }
};

export const getRecentAppIds = () => readIds(RECENT_APPS_KEY);

export const setRecentAppIds = (ids: string[]) =>
  writeIds(RECENT_APPS_KEY, ids, RECENT_APPS_EVENT);

export const recordRecentApp = (id: string, limit = MAX_RECENT_APPS) => {
  if (!id) return getRecentAppIds();
  const existing = getRecentAppIds().filter(appId => appId !== id);
  existing.unshift(id);
  const next = existing.slice(0, Math.max(limit, 0));
  setRecentAppIds(next);
  return next;
};

export const getFavoriteAppIds = () => readIds(FAVORITE_APPS_KEY);

export const setFavoriteAppIds = (ids: string[]) =>
  writeIds(FAVORITE_APPS_KEY, ids, FAVORITE_APPS_EVENT);

export const addFavoriteApp = (id: string) => {
  if (!id) return getFavoriteAppIds();
  const next = [...new Set([...getFavoriteAppIds(), id])];
  setFavoriteAppIds(next);
  return next;
};

export const removeFavoriteApp = (id: string) => {
  if (!id) return getFavoriteAppIds();
  const next = getFavoriteAppIds().filter(appId => appId !== id);
  setFavoriteAppIds(next);
  return next;
};

export const dispatchOpenApp = (id: string) => {
  if (!id || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_APP_EVENT, { detail: id }));
};
