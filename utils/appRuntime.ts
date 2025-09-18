type TimerHandle = number | NodeJS.Timeout;

type TimerEntry = {
  handle: TimerHandle;
  clear: () => void;
};

type HeapMetrics = {
  baseline: number;
  current: number;
};

const timers = new Map<string, Set<TimerEntry>>();
const heapMetrics = new Map<string, HeapMetrics>();

const defaultClear = (handle: TimerHandle) => {
  if (typeof handle === 'number') {
    clearTimeout(handle);
  } else {
    clearTimeout(handle);
  }
};

const ensureTimerSet = (appId: string) => {
  if (!timers.has(appId)) {
    timers.set(appId, new Set());
  }
  return timers.get(appId)!;
};

const ensureHeapEntry = (appId: string, fallback = 0): HeapMetrics => {
  if (!heapMetrics.has(appId)) {
    heapMetrics.set(appId, { baseline: fallback, current: fallback });
  }
  return heapMetrics.get(appId)!;
};

export const registerAppTimer = (
  appId: string,
  handle: TimerHandle,
  clearFn: (handle: TimerHandle) => void = defaultClear
) => {
  if (!appId || handle === null || typeof handle === 'undefined') {
    return () => {};
  }

  const entry: TimerEntry = {
    handle,
    clear: () => {
      try {
        clearFn(handle);
      } catch (err) {
        // ignore timer cleanup errors so force quit never crashes
      }
    },
  };

  const set = ensureTimerSet(appId);
  set.add(entry);

  return () => {
    const current = timers.get(appId);
    if (!current) return;
    current.delete(entry);
    if (current.size === 0) {
      timers.delete(appId);
    }
  };
};

export const clearAppTimers = (appId: string) => {
  const set = timers.get(appId);
  if (!set) return;
  timers.delete(appId);
  set.forEach((entry) => {
    entry.clear();
  });
};

export const setHeapBaseline = (appId: string, baseline: number) => {
  heapMetrics.set(appId, { baseline, current: baseline });
};

export const ensureHeapBaseline = (appId: string, baseline = 0) => {
  return ensureHeapEntry(appId, baseline);
};

export const updateHeapUsage = (appId: string, value: number) => {
  const entry = ensureHeapEntry(appId, value);
  entry.current = value;
};

export const resetHeapUsage = (appId: string) => {
  const entry = heapMetrics.get(appId);
  if (!entry) return;
  entry.current = entry.baseline;
};

export const getHeapMetrics = (appId: string) => {
  return heapMetrics.get(appId) ?? null;
};

export const cleanupAppRuntime = (appId: string) => {
  clearAppTimers(appId);
  resetHeapUsage(appId);
};

export const resetAppRuntime = () => {
  timers.clear();
  heapMetrics.clear();
};

export type { HeapMetrics };
