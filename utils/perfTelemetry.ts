export interface PerfTelemetryEntry {
  name: string;
  duration: number;
  startTime: number;
}

type TelemetryListener = (entry: PerfTelemetryEntry) => void;

const listeners = new Set<TelemetryListener>();

const envFlag = process.env.NEXT_PUBLIC_ENABLE_TELEMETRY;
const isDevEnv = process.env.NODE_ENV !== 'production';

const canUsePerformanceApi = () =>
  typeof window !== 'undefined' && typeof window.performance !== 'undefined';

export const isTelemetryActive = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  if (envFlag === 'true') {
    return true;
  }
  if (envFlag === 'false') {
    return false;
  }
  return isDevEnv;
};

export const markTelemetry = (markName: string) => {
  if (!isTelemetryActive() || !canUsePerformanceApi()) {
    return;
  }
  if (typeof performance.mark === 'function') {
    performance.mark(markName);
  }
};

export const measureTelemetry = (
  measureName: string,
  startMark: string,
  endMark: string
) => {
  if (!isTelemetryActive() || !canUsePerformanceApi()) {
    return null;
  }
  if (typeof performance.mark !== 'function' || typeof performance.measure !== 'function') {
    return null;
  }
  performance.mark(endMark);
  try {
    const entry = performance.measure(measureName, startMark, endMark);
    listeners.forEach((listener) => listener({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
    }));
    if (typeof performance.clearMarks === 'function') {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    }
    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures(measureName);
    }
    return entry;
  } catch (error) {
    return null;
  }
};

export const subscribeToTelemetry = (listener: TelemetryListener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
