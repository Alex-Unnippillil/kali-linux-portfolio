const DEFAULT_THRESHOLD_MS = 5;
const MAX_ENTRIES = 200;

const rawFlag =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_ENABLE_STATE_PROFILER
    : undefined;
const profilerFlag = rawFlag === 'true' || rawFlag === '1';
const isDev =
  typeof process !== 'undefined' ? process.env.NODE_ENV !== 'production' : true;

export interface SelectorProfileEntry {
  id: string;
  duration: number;
  threshold: number;
  timestamp: number;
  error?: boolean;
  metadata?: Record<string, unknown>;
}

export interface SelectorProfileOptions {
  thresholdMs?: number;
  metadata?: Record<string, unknown>;
}

const entries: SelectorProfileEntry[] = [];
let globalHookRegistered = false;

export const isSelectorProfilerEnabled = (): boolean => isDev && profilerFlag;

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const isPromiseLike = <T>(value: T | Promise<T>): value is Promise<T> =>
  !!value && typeof (value as any).then === 'function';

const ensureGlobalHook = () => {
  if (globalHookRegistered || typeof globalThis === 'undefined') return;
  const globalObj = globalThis as unknown as {
    __STATE_PROFILER__?: {
      getEntries: () => SelectorProfileEntry[];
      clear: () => void;
      isEnabled: () => boolean;
    };
  };
  if (!globalObj.__STATE_PROFILER__) {
    globalObj.__STATE_PROFILER__ = {
      getEntries: () => entries.slice(),
      clear: () => {
        entries.length = 0;
      },
      isEnabled: isSelectorProfilerEnabled,
    };
  }
  globalHookRegistered = true;
};

const recordEntry = (entry: SelectorProfileEntry) => {
  if (!isSelectorProfilerEnabled()) return;
  ensureGlobalHook();
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.shift();
  }
};

const logSlowSelector = (entry: SelectorProfileEntry) => {
  if (entry.duration < entry.threshold) return;
  const message =
    `[state-profiler] Selector "${entry.id}" took ${entry.duration.toFixed(
      2,
    )}ms (threshold ${entry.threshold}ms)` +
    (entry.error ? ' before throwing.' : '.');
  const meta = entry.metadata ? { metadata: entry.metadata } : undefined;
  console.warn(message, { ...entry, ...meta });
};

export function profileSelector<T>(
  id: string,
  fn: () => T,
  options?: SelectorProfileOptions,
): T;
export function profileSelector<T>(
  id: string,
  fn: () => Promise<T>,
  options?: SelectorProfileOptions,
): Promise<T>;
export function profileSelector<T>(
  id: string,
  fn: () => T | Promise<T>,
  options: SelectorProfileOptions = {},
): T | Promise<T> {
  if (!isSelectorProfilerEnabled()) {
    return fn();
  }

  const threshold = options.thresholdMs ?? DEFAULT_THRESHOLD_MS;
  const start = now();
  try {
    const result = fn();
    if (isPromiseLike(result)) {
      return result
        .then((value) => {
          const entry: SelectorProfileEntry = {
            id,
            duration: now() - start,
            threshold,
            timestamp: Date.now(),
            metadata: options.metadata,
          };
          recordEntry(entry);
          logSlowSelector(entry);
          return value;
        })
        .catch((error) => {
          const entry: SelectorProfileEntry = {
            id,
            duration: now() - start,
            threshold,
            timestamp: Date.now(),
            error: true,
            metadata: options.metadata,
          };
          recordEntry(entry);
          logSlowSelector(entry);
          throw error;
        });
    }
    const entry: SelectorProfileEntry = {
      id,
      duration: now() - start,
      threshold,
      timestamp: Date.now(),
      metadata: options.metadata,
    };
    recordEntry(entry);
    logSlowSelector(entry);
    return result;
  } catch (error) {
    const entry: SelectorProfileEntry = {
      id,
      duration: now() - start,
      threshold,
      timestamp: Date.now(),
      error: true,
      metadata: options.metadata,
    };
    recordEntry(entry);
    logSlowSelector(entry);
    throw error;
  }
}

export const getSelectorProfiles = (): SelectorProfileEntry[] => entries.slice();

export const clearSelectorProfiles = (): void => {
  entries.length = 0;
};

export const selectorProfiler = {
  isEnabled: isSelectorProfilerEnabled,
  profileSelector,
  getEntries: getSelectorProfiles,
  clear: clearSelectorProfiles,
};

export default selectorProfiler;
