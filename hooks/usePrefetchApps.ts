import { useEffect, useMemo, useRef } from 'react';
import { isBrowser } from '../utils/isBrowser';
import { safeLocalStorage } from '../utils/safeStorage';
import { logEvent } from '../utils/analytics';

type PrefetchFn = () => void | Promise<void>;

type ScreenWithPrefetch = {
  prefetch?: PrefetchFn;
};

export interface PrefetchableApp {
  id: string;
  title?: string;
  disabled?: boolean;
  favourite?: boolean;
  screen?: ScreenWithPrefetch;
  prefetch?: PrefetchFn;
  prefetchData?: PrefetchFn;
}

export interface PrefetchOptions {
  limit?: number;
  idleTimeout?: number;
}

interface FrequentEntry {
  id: string;
}

type IdleHandle = number | null;

interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): number;
}

interface IdleRequestOptions {
  timeout?: number;
}

interface IdleWindow extends Window {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

const RECENT_APPS_KEY = 'recentApps';
const FREQUENT_APPS_KEY = 'frequentApps';
const DEFAULT_LIMIT = 3;
const DEFAULT_IDLE_TIMEOUT = 2000;

export const DESKTOP_APP_LAUNCH_EVENT = 'desktop:app-launched';

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    return fallback;
  }
};

const readRecentApps = (): string[] => {
  if (!safeLocalStorage) return [];
  const data = parseJson<unknown>(safeLocalStorage.getItem(RECENT_APPS_KEY), []);
  if (!Array.isArray(data)) return [];
  return data.filter((id): id is string => typeof id === 'string');
};

const readFrequentApps = (): string[] => {
  if (!safeLocalStorage) return [];
  const data = parseJson<unknown>(safeLocalStorage.getItem(FREQUENT_APPS_KEY), []);
  if (!Array.isArray(data)) return [];
  return (data as FrequentEntry[])
    .map((item) => item?.id)
    .filter((id): id is string => typeof id === 'string');
};

const scheduleIdle = (fn: () => void, timeout: number): IdleHandle => {
  if (!isBrowser) return null;
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    return idleWindow.requestIdleCallback(() => fn(), { timeout });
  }
  return window.setTimeout(fn, timeout);
};

const cancelIdle = (handle: IdleHandle): void => {
  if (!isBrowser || handle === null) return;
  const idleWindow = window as IdleWindow;
  if (typeof idleWindow.cancelIdleCallback === 'function') {
    idleWindow.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
};

const unique = (ids: string[]): string[] => {
  const seen = new Set<string>();
  return ids.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const shouldSkipPrefetch = (): boolean => {
  if (!isBrowser) return true;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return Boolean(connection?.saveData);
};

const invokePrefetchers = (app: PrefetchableApp): boolean => {
  const candidates: PrefetchFn[] = [];
  const { prefetch, prefetchData, screen } = app;

  if (typeof prefetchData === 'function') candidates.push(prefetchData);
  if (typeof prefetch === 'function') candidates.push(prefetch);
  if (screen && typeof screen.prefetch === 'function') candidates.push(screen.prefetch);

  if (!candidates.length) return false;

  candidates.forEach((fn) => {
    try {
      const result = fn();
      if (result && typeof (result as Promise<void>).then === 'function') {
        void (result as Promise<void>).catch(() => undefined);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`Failed to prefetch resources for ${app.id}`, error);
      }
    }
  });

  return true;
};

const orderCandidates = (
  map: Map<string, PrefetchableApp>,
  prefetched: Set<string>,
  limit: number,
): PrefetchableApp[] => {
  const byRecency = readRecentApps();
  const byFrequency = readFrequentApps();
  const favourites = Array.from(map.values())
    .filter((app) => app.favourite)
    .map((app) => app.id);
  const fallback = Array.from(map.keys());

  const ordered = unique([
    ...byRecency,
    ...byFrequency,
    ...favourites,
    ...fallback,
  ]);

  const selected: PrefetchableApp[] = [];
  for (const id of ordered) {
    if (prefetched.has(id)) continue;
    const app = map.get(id);
    if (!app) continue;
    selected.push(app);
    if (selected.length >= limit) break;
  }
  return selected;
};

export const usePrefetchApps = (
  registry: PrefetchableApp[],
  options: PrefetchOptions = {},
): void => {
  const prefetchedRef = useRef<Set<string>>(new Set());
  const limit = options.limit ?? DEFAULT_LIMIT;
  const idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT;

  const registryMap = useMemo(() => {
    const map = new Map<string, PrefetchableApp>();
    registry.forEach((app) => {
      if (!app || typeof app.id !== 'string') return;
      if (app.disabled) return;
      if (map.has(app.id)) return;
      map.set(app.id, app);
    });
    return map;
  }, [registry]);

  useEffect(() => {
    if (!isBrowser) return undefined;
    if (!registryMap.size) return undefined;
    if (shouldSkipPrefetch()) return undefined;

    let handle: IdleHandle = null;

    const runPrefetch = () => {
      handle = null;
      const targetApps = orderCandidates(registryMap, prefetchedRef.current, limit);
      targetApps.forEach((app, index) => {
        const didPrefetch = invokePrefetchers(app);
        prefetchedRef.current.add(app.id);
        if (didPrefetch) {
          logEvent({
            category: 'App Prefetch',
            action: app.id,
            label: app.title ?? app.id,
            value: index + 1,
            nonInteraction: true,
          });
        }
      });
    };

    const schedule = () => {
      cancelIdle(handle);
      handle = scheduleIdle(runPrefetch, idleTimeout);
    };

    schedule();

    const listener = () => schedule();
    window.addEventListener(DESKTOP_APP_LAUNCH_EVENT, listener);

    return () => {
      window.removeEventListener(DESKTOP_APP_LAUNCH_EVENT, listener);
      cancelIdle(handle);
    };
  }, [idleTimeout, limit, registryMap]);
};

export default usePrefetchApps;
