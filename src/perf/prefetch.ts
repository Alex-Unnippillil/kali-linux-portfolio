import { isBrowser } from '../../utils/isBrowser';
import { safeLocalStorage } from '../../utils/safeStorage';

const USAGE_STORAGE_KEY = 'prefetch:app-usage';
const LEGACY_FREQUENT_KEY = 'frequentApps';
const RECENT_APPS_KEY = 'recentApps';
const DEFAULT_PREFETCH_LIMIT = 3;
const DEFAULT_IDLE_TIMEOUT = 5000;
const DEFAULT_MIN_BANDWIDTH = 1.5;
const DEFAULT_LOW_BATTERY_LEVEL = 0.3;
const MAX_TRACKED_APPS = 50;
const SLOW_CONNECTION_TYPES = new Set(['slow-2g', '2g']);

interface UsageEntry {
  id: string;
  count: number;
  lastUsed: number;
}

interface NetworkInformationLike {
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

interface BatteryManagerLike {
  charging?: boolean;
  level?: number;
}

interface NavigatorWithExtras extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
  getBattery?: () => Promise<BatteryManagerLike>;
}

export type PrefetchCallback = () => void | Promise<unknown>;
export type PrefetchRegistry =
  | Record<string, PrefetchCallback | undefined>
  | Map<string, PrefetchCallback | undefined>;

export interface PrefetchOptions {
  limit?: number;
  idleTimeoutMs?: number;
  minBandwidthMbps?: number;
  lowBatteryLevel?: number;
  slowConnectionTypes?: string[];
  onPrefetch?: (id: string) => void;
  logger?: (message: string, error?: unknown) => void;
}

export interface PrefetchController {
  cancel: () => void;
  readonly cancelled: boolean;
}

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  typeof value === 'object' && value !== null && typeof (value as Promise<unknown>).then === 'function';

const readUsageEntries = (): UsageEntry[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(USAGE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const { id, count, lastUsed } = entry as Partial<UsageEntry>;
        if (typeof id !== 'string') return null;
        return {
          id,
          count: typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : 0,
          lastUsed:
            typeof lastUsed === 'number' && Number.isFinite(lastUsed) ? lastUsed : Date.now(),
        } satisfies UsageEntry;
      })
      .filter((entry): entry is UsageEntry => Boolean(entry));
  } catch {
    return [];
  }
};

const writeUsageEntries = (entries: UsageEntry[]): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(
      USAGE_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_TRACKED_APPS))
    );
  } catch {
    // Ignore storage quota errors
  }
};

const readFrequentApps = (): UsageEntry[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(LEGACY_FREQUENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const { id, frequency } = item as { id?: unknown; frequency?: unknown };
        if (typeof id !== 'string') return null;
        const count = typeof frequency === 'number' && Number.isFinite(frequency) ? frequency : 0;
        return { id, count, lastUsed: 0 } satisfies UsageEntry;
      })
      .filter((entry): entry is UsageEntry => Boolean(entry));
  } catch {
    return [];
  }
};

const readRecentApps = (): string[] => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(RECENT_APPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};

const sortUsageEntries = (a: UsageEntry, b: UsageEntry): number => {
  if (a.count !== b.count) return b.count - a.count;
  return b.lastUsed - a.lastUsed;
};

const mergeUsageEntries = (base: UsageEntry[], updates: UsageEntry[]): UsageEntry[] => {
  if (!updates.length) return base.slice();
  const map = new Map<string, UsageEntry>();
  base.forEach((entry) => {
    map.set(entry.id, { ...entry });
  });
  updates.forEach((entry) => {
    const current = map.get(entry.id);
    if (current) {
      current.count = Math.max(current.count, entry.count);
      current.lastUsed = Math.max(current.lastUsed, entry.lastUsed);
    } else {
      map.set(entry.id, { ...entry });
    }
  });
  return Array.from(map.values());
};

const syncUsageMetrics = (): UsageEntry[] => {
  const base = readUsageEntries();
  const frequent = readFrequentApps();
  const recent = readRecentApps();
  const now = Date.now();

  const recentEntries: UsageEntry[] = recent.map((id, index) => ({
    id,
    count: 1,
    lastUsed: now - index * 1000,
  }));

  const merged = mergeUsageEntries(mergeUsageEntries(base, frequent), recentEntries);
  merged.sort(sortUsageEntries);
  writeUsageEntries(merged);
  return merged;
};

export const recordAppUsage = (id: string): void => {
  if (!id || typeof id !== 'string') return;
  const now = Date.now();
  const entries = readUsageEntries();
  const map = new Map(entries.map((entry) => [entry.id, { ...entry }]));
  const current = map.get(id);
  if (current) {
    current.count += 1;
    current.lastUsed = Math.max(current.lastUsed, now);
  } else {
    map.set(id, { id, count: 1, lastUsed: now });
  }
  const updated = Array.from(map.values());
  updated.sort(sortUsageEntries);
  writeUsageEntries(updated);
};

export const getTopAppIds = (limit = DEFAULT_PREFETCH_LIMIT): string[] => {
  if (!isBrowser || limit <= 0) return [];
  const entries = syncUsageMetrics();
  return entries.slice(0, Math.max(0, limit)).map((entry) => entry.id);
};

const requestIdle = (callback: () => void, timeout: number): number | null => {
  if (!isBrowser) return null;
  const idleWindow = window as typeof window & {
    requestIdleCallback?: (cb: IdleRequestCallback, options?: IdleRequestOptions) => number;
  };
  if (typeof idleWindow.requestIdleCallback === 'function') {
    return idleWindow.requestIdleCallback(() => callback(), { timeout });
  }
  return window.setTimeout(callback, timeout);
};

const cancelIdle = (handle: number | null): void => {
  if (!isBrowser || handle === null) return;
  const idleWindow = window as typeof window & {
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof idleWindow.cancelIdleCallback === 'function') {
    idleWindow.cancelIdleCallback(handle);
  } else {
    window.clearTimeout(handle);
  }
};

const getConnection = (nav: NavigatorWithExtras): NetworkInformationLike | undefined =>
  nav.connection || nav.mozConnection || nav.webkitConnection;

const evaluateNetworkConditions = (
  connection: NetworkInformationLike | undefined,
  minBandwidth: number,
  slowTypes: Set<string>,
  requested: number
): { allowed: boolean; maxItems: number } => {
  if (!connection) {
    return { allowed: true, maxItems: requested };
  }
  if (connection.saveData) {
    return { allowed: false, maxItems: 0 };
  }
  if (connection.effectiveType && slowTypes.has(connection.effectiveType)) {
    return { allowed: false, maxItems: 0 };
  }
  if (typeof connection.downlink === 'number' && connection.downlink > 0) {
    if (connection.downlink < minBandwidth) {
      const ratio = Math.max(connection.downlink / minBandwidth, 0);
      const scaled = Math.max(1, Math.floor(requested * ratio));
      return { allowed: true, maxItems: Math.min(requested, scaled) };
    }
  }
  return { allowed: true, maxItems: requested };
};

const getThrottleDelay = (connection: NetworkInformationLike | undefined): number => {
  if (!connection) return 0;
  const downlink = typeof connection.downlink === 'number' ? connection.downlink : 0;
  if (downlink >= 5) return 0;
  if (downlink <= 0) return 1000;
  const delay = Math.round(1000 / Math.max(downlink, 0.1));
  return Math.min(Math.max(delay, 250), 1200);
};

const shouldPrefetchOnPower = async (
  nav: NavigatorWithExtras,
  threshold: number
): Promise<boolean> => {
  const getBattery = nav.getBattery;
  if (typeof getBattery !== 'function') return true;
  try {
    const battery = await getBattery.call(nav);
    if (battery.charging) return true;
    if (typeof battery.level === 'number') {
      return battery.level > threshold;
    }
    return true;
  } catch {
    return true;
  }
};

const createNoopController = (): PrefetchController => ({
  cancel: () => {
    // noop
  },
  get cancelled() {
    return true;
  },
});

const resolvePrefetchCallback = (
  registry: PrefetchRegistry,
  id: string
): PrefetchCallback | undefined => {
  if (registry instanceof Map) {
    return registry.get(id);
  }
  return registry[id];
};

export const prefetchTopApps = (
  registry: PrefetchRegistry,
  options: PrefetchOptions = {}
): PrefetchController => {
  if (!isBrowser) return createNoopController();

  const limit = options.limit ?? DEFAULT_PREFETCH_LIMIT;
  if (limit <= 0) return createNoopController();

  const topIds = getTopAppIds(limit);
  if (!topIds.length) return createNoopController();

  const queue = topIds
    .map((id) => {
      const callback = resolvePrefetchCallback(registry, id);
      return typeof callback === 'function' ? { id, callback } : null;
    })
    .filter((item): item is { id: string; callback: PrefetchCallback } => Boolean(item));

  if (!queue.length) return createNoopController();

  const navigatorExtras = navigator as NavigatorWithExtras;
  const connection = getConnection(navigatorExtras);
  const slowTypes = new Set(options.slowConnectionTypes || Array.from(SLOW_CONNECTION_TYPES));
  const minBandwidth = options.minBandwidthMbps ?? DEFAULT_MIN_BANDWIDTH;

  const networkGate = evaluateNetworkConditions(
    connection,
    minBandwidth,
    slowTypes,
    queue.length
  );
  if (!networkGate.allowed) {
    return createNoopController();
  }

  const workQueue = queue.slice(0, Math.min(queue.length, Math.max(1, networkGate.maxItems)));
  if (!workQueue.length) {
    return createNoopController();
  }

  const cleanup = new Set<() => void>();
  let cancelled = false;

  const controller: PrefetchController = {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      cleanup.forEach((fn) => fn());
      cleanup.clear();
    },
    get cancelled() {
      return cancelled;
    },
  };

  const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      if (cancelled || ms <= 0) {
        resolve();
        return;
      }
      const timeout = window.setTimeout(() => {
        cleanup.delete(cancelTimeout);
        resolve();
      }, ms);
      const cancelTimeout = () => {
        window.clearTimeout(timeout);
        cleanup.delete(cancelTimeout);
        resolve();
      };
      cleanup.add(cancelTimeout);
    });

  const throttleDelay = getThrottleDelay(connection);

  let idleCleanup = () => {
    // Default noop until the idle handler is registered.
  };

  const runQueue = async () => {
    idleCleanup();
    if (cancelled) return;
    const allow = await shouldPrefetchOnPower(
      navigatorExtras,
      options.lowBatteryLevel ?? DEFAULT_LOW_BATTERY_LEVEL
    );
    if (!allow || cancelled) return;

    for (const { id, callback } of workQueue) {
      if (cancelled) break;
      try {
        const result = callback();
        if (isPromiseLike(result)) {
          await result;
        }
        options.onPrefetch?.(id);
      } catch (error) {
        if (typeof options.logger === 'function') {
          options.logger(`Failed to prefetch ${id}`, error);
        }
      }
      if (cancelled) break;
      if (throttleDelay > 0) {
        await delay(throttleDelay);
      }
    }
  };

  const idleTimeout = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT;
  const idleHandle = requestIdle(runQueue, idleTimeout);
  const cancelIdleHandle = () => cancelIdle(idleHandle);
  idleCleanup = () => {
    cleanup.delete(cancelIdleHandle);
  };
  if (idleHandle !== null) {
    cleanup.add(cancelIdleHandle);
  } else {
    void runQueue();
  }

  return controller;
};

const handleOpenAppEvent = (event: Event) => {
  const detail = (event as CustomEvent<unknown>).detail;
  if (typeof detail === 'string') {
    recordAppUsage(detail);
  } else if (detail && typeof detail === 'object' && 'id' in detail) {
    const id = (detail as { id?: unknown }).id;
    if (typeof id === 'string') {
      recordAppUsage(id);
    }
  }
};

let usageListenerRegistered = false;

const ensureUsageListener = () => {
  if (!isBrowser || usageListenerRegistered) return;
  window.addEventListener('open-app', handleOpenAppEvent as EventListener);
  usageListenerRegistered = true;
};

if (isBrowser) {
  ensureUsageListener();
}

export const __testUtils = {
  readUsageEntries,
  writeUsageEntries,
  syncUsageMetrics,
};
