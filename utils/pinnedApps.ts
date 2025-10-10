import { safeLocalStorage } from './safeStorage';

export const PINNED_APPS_STORAGE_KEY = 'pinnedApps';
export const PINNED_APPS_EVENT = 'pinned-apps-change';

type AppId = string;

type WithFavourite = {
  id: AppId;
  favourite?: boolean;
  favouriteOrder?: number;
};

type PinnedEventDetail = {
  ids?: AppId[];
};

const parsePinnedIds = (raw: string | null): AppId[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is AppId => typeof value === 'string');
  } catch {
    return [];
  }
};

export const sanitizePinnedAppIds = (
  ids: readonly unknown[],
  allAppIds?: readonly AppId[],
): AppId[] => {
  const valid = allAppIds ? new Set(allAppIds) : undefined;
  const seen = new Set<AppId>();
  const sanitized: AppId[] = [];

  ids.forEach((value) => {
    if (typeof value !== 'string') {
      return;
    }
    if (valid && !valid.has(value)) {
      return;
    }
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    sanitized.push(value);
  });

  return sanitized;
};

export const writePinnedAppIds = (
  ids: readonly AppId[],
  allAppIds?: readonly AppId[],
): AppId[] => {
  const sanitized = sanitizePinnedAppIds(ids, allAppIds);
  if (safeLocalStorage) {
    try {
      safeLocalStorage.setItem(PINNED_APPS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore storage write failures (quota, privacy modes)
    }
  }
  return sanitized;
};

export const readPinnedAppIds = (
  allAppIds: readonly AppId[],
  defaultPinned: readonly AppId[] = [],
): AppId[] => {
  const valid = new Set(allAppIds);
  const defaults = defaultPinned.filter((id) => valid.has(id));

  if (!safeLocalStorage) {
    return [...defaults];
  }

  const storedRaw = safeLocalStorage.getItem(PINNED_APPS_STORAGE_KEY);
  const stored = sanitizePinnedAppIds(parsePinnedIds(storedRaw), allAppIds);

  const seen = new Set<AppId>();
  const merged: AppId[] = [];

  stored.forEach((id) => {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  });

  defaults.forEach((id) => {
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  });

  const result = merged.length > 0 ? merged : [...defaults];

  if (safeLocalStorage) {
    try {
      safeLocalStorage.setItem(PINNED_APPS_STORAGE_KEY, JSON.stringify(result));
    } catch {
      // ignore write failures
    }
  }

  return result;
};

export const applyPinnedState = <T extends WithFavourite>(
  appList: readonly T[],
  pinnedIds: readonly AppId[],
): void => {
  const orderMap = new Map<AppId, number>();
  pinnedIds.forEach((id, index) => {
    orderMap.set(id, index);
  });

  appList.forEach((app) => {
    if (!app || typeof app !== 'object') {
      return;
    }
    const order = orderMap.get(app.id);
    if (order !== undefined) {
      app.favourite = true;
      (app as WithFavourite).favouriteOrder = order;
    } else {
      app.favourite = false;
      if ('favouriteOrder' in app) {
        try {
          delete (app as WithFavourite).favouriteOrder;
        } catch {
          (app as WithFavourite).favouriteOrder = undefined;
        }
      }
    }
  });
};

export const dispatchPinnedAppsChange = (ids: readonly AppId[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  const detail: PinnedEventDetail = { ids: Array.from(ids) };
  window.dispatchEvent(new CustomEvent(PINNED_APPS_EVENT, { detail }));
};

export type { AppId, PinnedEventDetail };
