import { cancelSchedule, clearSchedules, scheduleScan, ScheduledScan } from '../scanner/schedule';
import logger from '../utils/logger';
import { logUpdateEvent } from '../utils/analytics';

type RedactionSource = string[] | (() => string[]);

interface UpdateJobConfig<T> {
  id: string;
  label: string;
  schedule: string;
  execute: () => Promise<T>;
  packagesToRedact?: RedactionSource;
  onSuccess?: (result: T) => void;
  onFailure?: (message: string) => void;
}

interface RegisteredJob<T> {
  config: UpdateJobConfig<T>;
  pending?: Promise<void>;
}

export interface UpdateMetrics {
  attempts: number;
  successes: number;
  successRate: number;
  averageDuration: number;
  lastError?: string;
  lastRun?: number;
  lastDuration?: number;
}

const jobs = new Map<string, RegisteredJob<unknown>>();
const listeners = new Set<(metrics: UpdateMetrics) => void>();

const state: {
  attempts: number;
  successes: number;
  durations: number[];
  lastError?: string;
  lastRun?: number;
  lastDuration?: number;
} = {
  attempts: 0,
  successes: 0,
  durations: [],
};

const resolvePackages = (source?: RedactionSource): string[] => {
  if (!source) return [];
  if (typeof source === 'function') {
    try {
      const result = source();
      return Array.isArray(result) ? result : [];
    } catch {
      return [];
    }
  }
  return source;
};

const flattenSanitizedArgs = (args: unknown[]): string =>
  args
    .map((value) => {
      if (typeof value === 'string') return value;
      if (value && typeof value === 'object') {
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      }
      if (typeof value === 'undefined') return '';
      return String(value);
    })
    .filter(Boolean)
    .join(' ');

const getTime = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const cloneMetrics = (): UpdateMetrics => {
  const totalDuration = state.durations.reduce((sum, value) => sum + value, 0);
  const averageDuration = state.durations.length
    ? totalDuration / state.durations.length
    : 0;
  const successRate = state.attempts > 0 ? state.successes / state.attempts : 0;

  return {
    attempts: state.attempts,
    successes: state.successes,
    successRate,
    averageDuration,
    lastError: state.lastError,
    lastRun: state.lastRun,
    lastDuration: state.lastDuration,
  };
};

const notify = () => {
  const snapshot = cloneMetrics();
  listeners.forEach((listener) => listener(snapshot));
};

const runRegisteredJob = async (job: RegisteredJob<unknown>): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (job.pending) return job.pending;

  const attemptNumber = state.attempts + 1;
  state.attempts = attemptNumber;
  const { config } = job;
  logUpdateEvent('update_start', config.label, attemptNumber);
  const start = getTime();
  const packages = resolvePackages(config.packagesToRedact);

  job.pending = (async () => {
    try {
      const result = await config.execute();
      const end = getTime();
      const duration = end - start;
      state.successes += 1;
      state.durations.push(duration);
      state.lastDuration = duration;
      state.lastRun = Date.now();
      state.lastError = undefined;
      logUpdateEvent('update_success', config.label, Math.round(duration));
      config.onSuccess?.(result);
    } catch (error) {
      const sanitizedArgs = logger.errorWithRedaction(
        packages,
        `Update pipeline failed for ${config.label}`,
        { jobId: config.id, error },
      );
      const message = flattenSanitizedArgs(Array.isArray(sanitizedArgs) ? sanitizedArgs : []);
      state.lastError = message || 'Update failed';
      state.lastRun = Date.now();
      state.lastDuration = undefined;
      logUpdateEvent('update_retry', config.label, attemptNumber);
      config.onFailure?.(state.lastError);
    } finally {
      job.pending = undefined;
      notify();
    }
  })();

  await job.pending;
};

export const installUpdatePipeline = <T>(
  config: UpdateJobConfig<T>,
): ScheduledScan | null => {
  if (typeof window === 'undefined') return null;
  const existing = jobs.get(config.id) as RegisteredJob<T> | undefined;
  if (existing) {
    existing.config = config;
    return null;
  }
  const registered: RegisteredJob<T> = { config };
  jobs.set(config.id, registered);
  const scheduled = scheduleScan(config.id, config.schedule, () => {
    void runRegisteredJob(registered);
  });
  return scheduled;
};

export const uninstallUpdatePipeline = (id: string): void => {
  cancelSchedule(id);
  jobs.delete(id);
};

export const runUpdateJob = async (id: string): Promise<void> => {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`No update job registered for ${id}`);
  }
  await runRegisteredJob(job);
};

export const getUpdateMetrics = (): UpdateMetrics => cloneMetrics();

export const subscribeToUpdateMetrics = (
  listener: (metrics: UpdateMetrics) => void,
): (() => void) => {
  listeners.add(listener);
  listener(cloneMetrics());
  return () => {
    listeners.delete(listener);
  };
};

export const __resetUpdateCenter = () => {
  jobs.forEach((_, id) => cancelSchedule(id));
  jobs.clear();
  listeners.clear();
  state.attempts = 0;
  state.successes = 0;
  state.durations = [];
  state.lastError = undefined;
  state.lastRun = undefined;
  state.lastDuration = undefined;
  clearSchedules();
};
