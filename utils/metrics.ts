/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Metric } from 'web-vitals';

type WebVitalName = 'LCP' | 'INP' | 'CLS';
type CustomMetricName = 'rowsRendered' | 'workerTime';
export type MetricName = WebVitalName | CustomMetricName;

export interface MetricSample {
  name: MetricName;
  value: number;
  timestamp: number;
  detail?: Record<string, string | number | boolean>;
}

export interface PercentilePoint {
  timestamp: number;
  p75: number | null;
  p95: number | null;
  count: number;
}

export type MetricsSnapshot = Record<MetricName, MetricSample[]>;

const STORAGE_KEY = 'dev-metrics:batches';
const BATCH_SIZE = 12;
const MAX_BATCHES = 48;
const FLUSH_INTERVAL_MS = 15000;

let analyticsEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
let allowNetwork = false;
let metricsActive = false;
let hydrationAttempted = false;
let observersStarted = false;

const buffer: MetricSample[] = [];
let persisted: MetricSample[][] = [];
const subscribers = new Set<(snapshot: MetricsSnapshot) => void>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const isBrowser = typeof window !== 'undefined';

const computePercentile = (values: number[], percentile: number): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] + (sorted[upper] - sorted[lower]) * weight;
};

const stopFlushTimer = () => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
};

const persistBatches = () => {
  if (!isBrowser) return;
  try {
    const serialisable = persisted.map((batch) =>
      batch.map((sample) => ({
        name: sample.name,
        value: sample.value,
        timestamp: sample.timestamp,
        detail: sample.detail,
      })),
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialisable));
  } catch {
    // Ignore storage failures (private browsing, quota errors, etc.)
  }
};

const hydrateFromStorage = () => {
  if (!isBrowser || hydrationAttempted) return;
  hydrationAttempted = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    persisted = parsed
      .filter((batch) => Array.isArray(batch))
      .map((batch) =>
        batch
          .map((entry: any) => ({
            name: entry.name as MetricName,
            value: Number(entry.value),
            timestamp: Number(entry.timestamp),
            detail:
              entry.detail && typeof entry.detail === 'object'
                ? (entry.detail as Record<string, string | number | boolean>)
                : undefined,
          }))
          .filter((entry) =>
            typeof entry.name === 'string' &&
            !Number.isNaN(entry.value) &&
            !Number.isNaN(entry.timestamp),
          ),
      )
      .filter((batch) => batch.length > 0);
  } catch {
    persisted = [];
  }
};

const getAllSamples = (): MetricSample[] => {
  const batches = persisted.flat();
  return [...batches, ...buffer].sort((a, b) => a.timestamp - b.timestamp);
};

export const getMetricsSnapshot = (): MetricsSnapshot => {
  const snapshot: Partial<MetricsSnapshot> = {};
  for (const sample of getAllSamples()) {
    const list = snapshot[sample.name] ?? [];
    list.push(sample);
    snapshot[sample.name] = list;
  }
  return snapshot as MetricsSnapshot;
};

const notifySubscribers = () => {
  if (!subscribers.size) return;
  const snapshot = getMetricsSnapshot();
  subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Ignore subscriber failures so they do not break collection
    }
  });
};

const flushBuffer = () => {
  if (!buffer.length) return;
  persisted.push([...buffer]);
  buffer.length = 0;
  while (persisted.length > MAX_BATCHES) {
    persisted.shift();
  }
  persistBatches();
};

const clearAll = () => {
  stopFlushTimer();
  buffer.length = 0;
  persisted = [];
  if (isBrowser) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  notifySubscribers();
};

const canCollect = () => analyticsEnabled && allowNetwork;

const ensureActiveState = () => {
  const nextActive = canCollect();
  if (nextActive === metricsActive) return;
  metricsActive = nextActive;
  if (metricsActive) {
    hydrateFromStorage();
    startWebVitalObservers();
    notifySubscribers();
  } else {
    clearAll();
  }
};

const scheduleFlush = () => {
  if (!metricsActive || !isBrowser || flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushBuffer();
    notifySubscribers();
  }, FLUSH_INTERVAL_MS);
};

const recordSample = (sample: MetricSample) => {
  if (!metricsActive) return;
  buffer.push(sample);
  if (buffer.length >= BATCH_SIZE) {
    flushBuffer();
  }
  scheduleFlush();
  notifySubscribers();
};

const startWebVitalObservers = async () => {
  if (!metricsActive || observersStarted || !isBrowser) return;
  observersStarted = true;
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  try {
    const { onCLS, onINP, onLCP } = await import('web-vitals');
    const handler = (metric: Metric) => {
      const name = metric.name as WebVitalName;
      recordSample({ name, value: metric.value, timestamp: Date.now(), detail: { id: metric.id } });
    };
    onCLS(handler);
    onINP(handler);
    onLCP(handler);
  } catch {
    // Ignore observer setup errors
  }
};

export const updateMetricsConsent = ({
  allowNetwork: allow,
  analyticsEnabled: analytics,
}: {
  allowNetwork?: boolean;
  analyticsEnabled?: boolean;
}): void => {
  if (typeof allow === 'boolean') {
    allowNetwork = allow;
  }
  if (typeof analytics === 'boolean') {
    analyticsEnabled = analytics;
  }
  ensureActiveState();
};

export const recordRowsRendered = (
  rows: number,
  detail?: Record<string, string | number | boolean>,
): void => {
  recordSample({ name: 'rowsRendered', value: rows, timestamp: Date.now(), detail });
};

export const recordWorkerTime = (
  durationMs: number,
  detail?: Record<string, string | number | boolean>,
): void => {
  recordSample({ name: 'workerTime', value: durationMs, timestamp: Date.now(), detail });
};

export const recordWebVitalMetric = (
  name: WebVitalName,
  value: number,
  detail?: Record<string, string | number | boolean>,
): void => {
  recordSample({ name, value, timestamp: Date.now(), detail });
};

export const subscribeToMetrics = (
  listener: (snapshot: MetricsSnapshot) => void,
): (() => void) => {
  subscribers.add(listener);
  try {
    listener(getMetricsSnapshot());
  } catch {
    // Ignore synchronous subscriber errors
  }
  return () => {
    subscribers.delete(listener);
  };
};

export const getMetricSummary = (
  name: MetricName,
  windowMs: number,
): { p75: number | null; p95: number | null; count: number } => {
  const cutoff = Date.now() - windowMs;
  const samples = getAllSamples().filter((sample) => sample.name === name && sample.timestamp >= cutoff);
  const values = samples.map((sample) => sample.value);
  return {
    p75: computePercentile(values, 75),
    p95: computePercentile(values, 95),
    count: samples.length,
  };
};

export const getRollingSeries = (
  name: MetricName,
  windowMs: number,
  buckets: number,
): PercentilePoint[] => {
  const samples = getAllSamples().filter((sample) => sample.name === name);
  if (!samples.length || buckets <= 0) return [];
  const now = Date.now();
  const bucketSize = Math.max(1, Math.floor(windowMs / buckets));
  const series: PercentilePoint[] = [];
  for (let i = buckets - 1; i >= 0; i -= 1) {
    const end = now - (buckets - 1 - i) * bucketSize;
    const start = end - bucketSize;
    const bucketValues = samples
      .filter((sample) => sample.timestamp > start && sample.timestamp <= end)
      .map((sample) => sample.value);
    series.push({
      timestamp: end,
      p75: computePercentile(bucketValues, 75),
      p95: computePercentile(bucketValues, 95),
      count: bucketValues.length,
    });
  }
  return series.sort((a, b) => a.timestamp - b.timestamp);
};

export const isMetricsCollectionEnabled = (): boolean => metricsActive;

export const __testing = {
  reset(): void {
    stopFlushTimer();
    buffer.length = 0;
    persisted = [];
    hydrationAttempted = false;
    observersStarted = false;
  },
  forceFlush(): void {
    flushBuffer();
    notifySubscribers();
  },
  getState(): { buffer: MetricSample[]; persisted: MetricSample[][] } {
    return { buffer: [...buffer], persisted: persisted.map((batch) => [...batch]) };
  },
};

