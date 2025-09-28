"use client";

import apps from '../apps.config';
import { safeLocalStorage } from './safeStorage';
import { defaults } from './settingsStore.js';

export const MENU_CONFIG_EVENT = 'menu-config-updated';
export const MENU_CONFIG_VERSION = 1;

const FAVORITES_KEY = 'launcherFavorites';
const PINNED_KEY = 'pinnedApps';
const DESKTOP_SESSION_KEY = 'desktop-session';

interface DesktopSessionRecord {
  windows?: unknown;
  wallpaper?: unknown;
  dock?: unknown;
  [key: string]: unknown;
}

export interface MenuConfigSnapshot {
  favorites: string[];
  pins: string[];
  ordering: string[];
}

export interface MenuConfigImportResult extends MenuConfigSnapshot {
  ignoredFavorites: string[];
  ignoredPins: string[];
  ignoredOrdering: string[];
}

export type MenuConfigInput = Partial<{
  favorites: unknown;
  pins: unknown;
  ordering: unknown;
  version: unknown;
}>;

type SanitizeResult = {
  ids: string[];
  ignored: string[];
};

type AppLike = {
  id?: unknown;
  favourite?: unknown;
};

const availableAppIds = new Set(
  ((apps as AppLike[]) ?? [])
    .map((app) => (app && typeof app.id === 'string' ? app.id : null))
    .filter((id): id is string => Boolean(id)),
);

const sanitizeIds = (value: unknown): SanitizeResult => {
  if (!Array.isArray(value)) {
    return { ids: [], ignored: [] };
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  const ignored: string[] = [];
  value.forEach((entry) => {
    if (typeof entry !== 'string') {
      return;
    }
    if (!availableAppIds.has(entry)) {
      ignored.push(entry);
      return;
    }
    if (seen.has(entry)) {
      return;
    }
    seen.add(entry);
    ids.push(entry);
  });
  return { ids, ignored };
};

const readJsonArray = (key: string): unknown => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
};

const writeJsonArray = (key: string, value: unknown[]): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const readFavoritesFromStorage = (): string[] => sanitizeIds(readJsonArray(FAVORITES_KEY)).ids;

const writeFavoritesToStorage = (favorites: string[]): void => {
  writeJsonArray(FAVORITES_KEY, favorites);
};

const readPinnedFromStorage = (): string[] => sanitizeIds(readJsonArray(PINNED_KEY)).ids;

const writePinnedToStorage = (pins: string[]): void => {
  writeJsonArray(PINNED_KEY, pins);
};

const readSession = (): DesktopSessionRecord | null => {
  if (!safeLocalStorage) return null;
  try {
    const raw = safeLocalStorage.getItem(DESKTOP_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as DesktopSessionRecord;
    }
  } catch {
    // ignore parsing errors
  }
  return null;
};

const writeSession = (session: DesktopSessionRecord): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(DESKTOP_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore write errors
  }
};

const readOrderingFromStorage = (): string[] => {
  const session = readSession();
  if (!session) return [];
  return sanitizeIds(session.dock).ids;
};

const writeOrderingToStorage = (ordering: string[]): void => {
  const session = readSession() ?? {};
  const next: DesktopSessionRecord = { ...session };
  next.dock = ordering;
  if (!Array.isArray(next.windows)) {
    next.windows = [];
  }
  if (typeof next.wallpaper !== 'string') {
    next.wallpaper = defaults.wallpaper;
  }
  writeSession(next);
};

const applyPinsToAppConfig = (pins: string[]): void => {
  const pinnedSet = new Set(pins);
  (apps as AppLike[]).forEach((app) => {
    if (!app || typeof app !== 'object') return;
    if (typeof app.id !== 'string') return;
    (app as AppLike).favourite = pinnedSet.has(app.id) ? true : false;
  });
};

const mergeOrdering = (pins: string[], ordering: string[]): string[] => {
  const order = ordering.filter((id) => pins.includes(id));
  const seen = new Set(order);
  pins.forEach((id) => {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  });
  return order;
};

const getSnapshotFromStorage = (): MenuConfigSnapshot => {
  const favorites = readFavoritesFromStorage();
  const pins = readPinnedFromStorage();
  const ordering = mergeOrdering(pins, readOrderingFromStorage());
  return { favorites, pins, ordering };
};

const setSnapshotToStorage = (snapshot: MenuConfigSnapshot): void => {
  writeFavoritesToStorage(snapshot.favorites);
  writePinnedToStorage(snapshot.pins);
  writeOrderingToStorage(snapshot.ordering);
  applyPinsToAppConfig(snapshot.pins);
};

export const readMenuConfig = (): MenuConfigSnapshot => getSnapshotFromStorage();

export const emitMenuConfigUpdate = (detail?: MenuConfigSnapshot): void => {
  if (typeof window === 'undefined') return;
  const payload = detail ?? getSnapshotFromStorage();
  window.dispatchEvent(new CustomEvent<MenuConfigSnapshot>(MENU_CONFIG_EVENT, { detail: payload }));
};

export const exportMenuConfig = (): string => {
  const snapshot = getSnapshotFromStorage();
  return JSON.stringify({ version: MENU_CONFIG_VERSION, ...snapshot }, null, 2);
};

const coerceArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const importMenuConfig = (
  input: string | MenuConfigInput,
): MenuConfigImportResult => {
  let payload: MenuConfigInput;
  if (typeof input === 'string') {
    try {
      payload = JSON.parse(input);
    } catch (error) {
      throw new Error('Invalid menu configuration: unable to parse JSON');
    }
  } else {
    payload = input;
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Menu configuration must be an object');
  }

  const { ids: favoriteIds, ignored: ignoredFavorites } = sanitizeIds(
    coerceArray(payload.favorites),
  );
  const { ids: pinIdsRaw, ignored: ignoredPins } = sanitizeIds(
    coerceArray(payload.pins),
  );
  const { ids: orderingIdsRaw, ignored: ignoredOrdering } = sanitizeIds(
    coerceArray(payload.ordering),
  );

  const pins = pinIdsRaw;
  const ordering = mergeOrdering(pins, orderingIdsRaw);
  const snapshot: MenuConfigSnapshot = {
    favorites: favoriteIds,
    pins,
    ordering,
  };

  setSnapshotToStorage(snapshot);
  emitMenuConfigUpdate(snapshot);

  return {
    ...snapshot,
    ignoredFavorites,
    ignoredPins,
    ignoredOrdering,
  };
};

export const setPinnedApps = (pins: string[], emit = true): void => {
  const ordering = mergeOrdering(pins, readOrderingFromStorage());
  const snapshot: MenuConfigSnapshot = {
    favorites: readFavoritesFromStorage(),
    pins,
    ordering,
  };
  setSnapshotToStorage(snapshot);
  if (emit) emitMenuConfigUpdate(snapshot);
};

export const setFavoritesList = (favorites: string[], emit = true): void => {
  const pins = readPinnedFromStorage();
  const ordering = mergeOrdering(pins, readOrderingFromStorage());
  const snapshot: MenuConfigSnapshot = {
    favorites,
    pins,
    ordering,
  };
  setSnapshotToStorage(snapshot);
  if (emit) emitMenuConfigUpdate(snapshot);
};

export const getPinnedOrder = (): string[] => readOrderingFromStorage();
