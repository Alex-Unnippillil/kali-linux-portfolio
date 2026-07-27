/*
 * Performance long task tracking utilities.
 *
 * Collects long tasks (> threshold) using the PerformanceObserver API and
 * aggregates offenders so developer tooling can surface likely issues.
 */

interface PerformanceEntryAttribution {
  name?: string;
  entryType?: string;
  startTime?: number;
  duration?: number;
  containerType?: string;
  containerName?: string;
  containerId?: string;
  containerSrc?: string;
  nodeId?: string;
  url?: string;
  scriptId?: string;
  scriptURL?: string;
  workerName?: string;
  stack?: string;
  toJSON?: () => Record<string, unknown>;
  [key: string]: unknown;
}

interface PerformanceEntryWithAttribution extends PerformanceEntry {
  duration: number;
  startTime: number;
  attribution?: PerformanceEntryAttribution[];
  toJSON?: () => {
    attribution?: PerformanceEntryAttribution[];
    [key: string]: unknown;
  };
}

const MICRO_TASK: (cb: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (cb: () => void) => {
        Promise.resolve().then(cb);
      };

type Listener = (snapshot: LongTaskSnapshot) => void;

type InternalInsight = {
  key: string;
  label: string;
  occurrences: number;
  totalDuration: number;
  maxDuration: number;
  lastStartTime: number;
  scriptURL?: string;
  stackTraces: Set<string>;
};

type InternalSample = {
  id: string;
  key: string;
  label: string;
  duration: number;
  startTime: number;
  scriptURL?: string;
  stack?: string;
};

const state: {
  threshold: number;
  observing: boolean;
  debug: boolean;
  observer: PerformanceObserver | null;
  insights: Map<string, InternalInsight>;
  samples: InternalSample[];
} = {
  threshold: 50,
  observing: false,
  debug: false,
  observer: null,
  insights: new Map(),
  samples: [],
};

const listeners = new Set<Listener>();
let notifyPending = false;

export interface LongTaskInsight {
  key: string;
  label: string;
  occurrences: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  lastStartTime: number;
  scriptURL?: string;
  stackTraces: string[];
}

export interface LongTaskSample {
  id: string;
  key: string;
  label: string;
  duration: number;
  startTime: number;
  scriptURL?: string;
  stack?: string;
}

export interface LongTaskSnapshot {
  insights: LongTaskInsight[];
  samples: LongTaskSample[];
  observing: boolean;
  debug: boolean;
  threshold: number;
  supported: boolean;
}

const isWindowAvailable = () => typeof window !== 'undefined';

export const isLongTaskObserverSupported = () => {
  if (!isWindowAvailable()) return false;
  return (
    typeof PerformanceObserver !== 'undefined' &&
    // @ts-expect-error Checking existence in window for browsers that expose it.
    typeof (window as unknown as { PerformanceLongTaskTiming?: unknown })
      .PerformanceLongTaskTiming !== 'undefined'
  );
};

const buildStackLink = (
  attribution?: PerformanceEntryAttribution,
  entry?: PerformanceEntryWithAttribution,
) => {
  const stackFromAttr = attribution && ('stack' in attribution ? attribution.stack : undefined);
  if (stackFromAttr && typeof stackFromAttr === 'string' && stackFromAttr.trim().length) {
    return stackFromAttr;
  }

  const fromAttrJson = attribution?.toJSON?.();
  const jsonStack = fromAttrJson && typeof fromAttrJson.stack === 'string' ? fromAttrJson.stack : undefined;
  if (jsonStack && jsonStack.trim().length) return jsonStack;

  const json = entry?.toJSON?.();
  const entryStack =
    json && Array.isArray(json.attribution) && typeof json.attribution[0]?.stack === 'string'
      ? (json.attribution[0]?.stack as string)
      : undefined;
  return entryStack && entryStack.trim().length ? entryStack : undefined;
};

const describeEntry = (entry: PerformanceEntryWithAttribution) => {
  const attribution = entry.attribution && entry.attribution[0];
  const scriptURL = attribution?.scriptURL || attribution?.containerSrc;
  const labelParts = [attribution?.name, attribution?.containerName, scriptURL]
    .filter(Boolean)
    .map((part) => String(part));
  const label = labelParts.length ? labelParts.join(' · ') : entry.name || 'Long task';
  const key = scriptURL || attribution?.name || attribution?.containerName || entry.name || 'unknown';
  const stack = buildStackLink(attribution, entry);

  return {
    attribution,
    key,
    label,
    scriptURL,
    stack,
  };
};

const toPublicInsights = (): LongTaskInsight[] => {
  const items = Array.from(state.insights.values()).map((insight) => ({
    key: insight.key,
    label: insight.label,
    occurrences: insight.occurrences,
    totalDuration: insight.totalDuration,
    avgDuration: insight.totalDuration / Math.max(insight.occurrences, 1),
    maxDuration: insight.maxDuration,
    lastStartTime: insight.lastStartTime,
    scriptURL: insight.scriptURL,
    stackTraces: Array.from(insight.stackTraces),
  }));

  return items.sort((a, b) => b.totalDuration - a.totalDuration);
};

const toPublicSamples = (): LongTaskSample[] => state.samples.slice();

const scheduleNotify = () => {
  if (notifyPending) return;
  notifyPending = true;
  MICRO_TASK(() => {
    notifyPending = false;
    const snapshot = getLongTaskSnapshot();
    listeners.forEach((listener) => listener(snapshot));
  });
};

const debugLog = (...args: unknown[]) => {
  if (!state.debug) return;
  if (typeof console !== 'undefined' && typeof console.debug === 'function') {
    console.debug('[perf:long-task]', ...args);
  }
};

const processEntries = (entries: PerformanceEntry[]) => {
  entries.forEach((entry) => {
    const longTask = entry as PerformanceEntryWithAttribution;
    if (!longTask || typeof longTask.duration !== 'number') return;
    if (longTask.duration < state.threshold) return;

    const description = describeEntry(longTask);
    const existing = state.insights.get(description.key);

    if (existing) {
      existing.occurrences += 1;
      existing.totalDuration += longTask.duration;
      existing.maxDuration = Math.max(existing.maxDuration, longTask.duration);
      existing.lastStartTime = longTask.startTime;
      existing.label = description.label;
      if (description.scriptURL) existing.scriptURL = description.scriptURL;
      if (description.stack) existing.stackTraces.add(description.stack);
    } else {
      state.insights.set(description.key, {
        key: description.key,
        label: description.label,
        occurrences: 1,
        totalDuration: longTask.duration,
        maxDuration: longTask.duration,
        lastStartTime: longTask.startTime,
        scriptURL: description.scriptURL,
        stackTraces: new Set(description.stack ? [description.stack] : []),
      });
    }

    const sample: InternalSample = {
      id: `${Math.round(longTask.startTime)}-${Math.round(longTask.duration * 1000)}`,
      key: description.key,
      label: description.label,
      duration: longTask.duration,
      startTime: longTask.startTime,
      scriptURL: description.scriptURL,
      stack: description.stack,
    };

    state.samples.unshift(sample);
    if (state.samples.length > 40) {
      state.samples.length = 40;
    }

    debugLog('Long task recorded', {
      key: description.key,
      duration: longTask.duration,
      scriptURL: description.scriptURL,
      stack: description.stack,
    });
  });

  if (entries.length) scheduleNotify();
};

export const getLongTaskSnapshot = (): LongTaskSnapshot => ({
  insights: toPublicInsights(),
  samples: toPublicSamples(),
  observing: state.observing,
  debug: state.debug,
  threshold: state.threshold,
  supported: isLongTaskObserverSupported(),
});

export const subscribeToLongTaskInsights = (listener: Listener) => {
  listeners.add(listener);
  listener(getLongTaskSnapshot());
  return () => {
    listeners.delete(listener);
  };
};

export const startLongTaskObserver = (options?: { threshold?: number }) => {
  if (options?.threshold) {
    state.threshold = options.threshold;
  }

  if (!isLongTaskObserverSupported()) {
    debugLog('PerformanceObserver longtask support is unavailable.');
    return false;
  }

  if (state.observing) return true;

  try {
    state.observer = new PerformanceObserver((list) => {
      processEntries(list.getEntries());
    });
    state.observer.observe({ type: 'longtask', buffered: true });
    state.observing = true;
    scheduleNotify();
    debugLog('Long task observer started.', { threshold: state.threshold });
    return true;
  } catch (error) {
    debugLog('Failed to start long task observer', error);
    state.observer = null;
    state.observing = false;
    return false;
  }
};

export const stopLongTaskObserver = () => {
  if (state.observer) {
    state.observer.disconnect();
    state.observer = null;
  }
  if (state.observing) {
    state.observing = false;
    scheduleNotify();
    debugLog('Long task observer stopped.');
  }
};

export const clearLongTaskData = () => {
  state.insights.clear();
  state.samples.length = 0;
  scheduleNotify();
  debugLog('Cleared long task data.');
};

export const setLongTaskDebugLogging = (enabled: boolean) => {
  if (state.debug === enabled) return;
  state.debug = enabled;
  scheduleNotify();
  debugLog('Debug logging toggled.', { enabled });
};

export const setLongTaskThreshold = (threshold: number) => {
  if (Number.isNaN(threshold) || threshold <= 0) return;
  state.threshold = threshold;
  scheduleNotify();
  debugLog('Threshold updated.', { threshold });
};
