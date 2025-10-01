export interface ScheduledScan {
  id: string;
  schedule: string;
}

export type SchedulerPriority = 'input' | 'high' | 'normal' | 'low';

interface SchedulerConfig {
  overloadLagMs: number;
  minIntervalMs: Record<SchedulerPriority, number>;
  /**
   * Number of most recent shed events to retain for diagnostics.
   */
  maxEventLog: number;
}

export interface SchedulerEvent {
  id: string;
  label: string;
  priority: SchedulerPriority;
  reason: 'overload' | 'min-interval';
  timestamp: number;
  lagMs: number;
  skipped: number;
}

export interface SchedulerDiagnostics {
  config: SchedulerConfig;
  metrics: {
    overloadEvents: number;
    lastLagMs: number;
    lastOverloadAt: number | null;
    inputExecutions: number;
    lastInputLabel: string | null;
    lastInputDurationMs: number;
    shedEvents: SchedulerEvent[];
  };
  running: Array<
    ScheduledScan & {
      priority: SchedulerPriority;
      shedCount: number;
      label: string;
    }
  >;
}

interface RunningScan extends ScheduledScan {
  timer: ReturnType<typeof setInterval>;
  callback: () => void;
  interval: number;
  priority: SchedulerPriority;
  minInterval: number;
  lastRun: number;
  shedCount: number;
  label: string;
  usesCustomMinInterval: boolean;
}

interface ScheduleOptions {
  priority?: SchedulerPriority;
  /**
   * Override the default minimum interval between callback executions.
   */
  minIntervalMs?: number;
  /**
   * Human readable label for diagnostics.
   */
  label?: string;
}

const STORAGE_KEY = 'scanSchedules';
const runningScans: RunningScan[] = [];

const defaultConfig: SchedulerConfig = {
  overloadLagMs: 120,
  minIntervalMs: {
    input: 0,
    high: 8,
    normal: 33,
    low: 100,
  },
  maxEventLog: 25,
};

let schedulerConfig: SchedulerConfig = { ...defaultConfig };

const metrics = {
  overloadEvents: 0,
  lastLagMs: 0,
  lastOverloadAt: null as number | null,
  inputExecutions: 0,
  lastInputLabel: null as string | null,
  lastInputDurationMs: 0,
  shedEvents: [] as SchedulerEvent[],
};

type Listener = (diagnostics: SchedulerDiagnostics) => void;

const listeners = new Set<Listener>();

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const notify = () => {
  if (listeners.size === 0) return;
  const snapshot = getSchedulerDiagnostics();
  listeners.forEach((listener) => listener(snapshot));
};

const recordShedEvent = (event: SchedulerEvent) => {
  metrics.shedEvents = [event, ...metrics.shedEvents].slice(
    0,
    schedulerConfig.maxEventLog,
  );
  notify();
};

const resetMetrics = () => {
  metrics.overloadEvents = 0;
  metrics.lastLagMs = 0;
  metrics.lastOverloadAt = null;
  metrics.inputExecutions = 0;
  metrics.lastInputLabel = null;
  metrics.lastInputDurationMs = 0;
  metrics.shedEvents = [];
};

export const loadScheduledScans = (): ScheduledScan[] => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const persistSchedules = (jobs: ScheduledScan[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  notify();
};

export const cronToInterval = (expr: string): number => {
  const parts = expr.trim().split(/\s+/);
  if (parts.length === 6) {
    const sec = parts[0];
    const match = /^\*\/(\d+)$/.exec(sec);
    if (match) return parseInt(match[1], 10) * 1000;
  }
  if (parts.length >= 5) {
    const min = parts.length === 5 ? parts[0] : parts[1];
    const match = /^\*\/(\d+)$/.exec(min);
    if (match) return parseInt(match[1], 10) * 60 * 1000;
  }
  throw new Error('Unsupported cron expression');
};

export const scheduleScan = (
  id: string,
  schedule: string,
  callback: () => void,
  options: ScheduleOptions = {},
): ScheduledScan => {
  const jobs = loadScheduledScans();
  jobs.push({ id, schedule });
  persistSchedules(jobs);
  const interval = cronToInterval(schedule);
  const priority = options.priority ?? 'normal';
  const minInterval = Math.max(
    0,
    options.minIntervalMs ?? schedulerConfig.minIntervalMs[priority],
  );
  const label = options.label ?? id;
  const usesCustomMinInterval = options.minIntervalMs !== undefined;
  const job: RunningScan = {
    id,
    schedule,
    timer: undefined as unknown as ReturnType<typeof setInterval>,
    callback,
    interval,
    priority,
    minInterval,
    lastRun: 0,
    shedCount: 0,
    label,
    usesCustomMinInterval,
  };

  const runner = () => {
    const current = now();
    const expected = job.lastRun ? job.lastRun + job.interval : current;
    const lag = current - expected;
    metrics.lastLagMs = lag;
    const overloaded = lag > schedulerConfig.overloadLagMs;
    if (overloaded) {
      metrics.overloadEvents += 1;
      metrics.lastOverloadAt = Date.now();
    }

    const timeSinceRun = current - job.lastRun;
    const enforceCap = job.lastRun > 0 && timeSinceRun < job.minInterval;
    const shouldShed =
      job.priority !== 'input' &&
      (enforceCap || (overloaded && job.priority === 'low'));

    if (shouldShed) {
      job.shedCount += 1;
      recordShedEvent({
        id: job.id,
        label: job.label,
        priority: job.priority,
        reason: enforceCap ? 'min-interval' : 'overload',
        timestamp: Date.now(),
        lagMs: lag,
        skipped: job.shedCount,
      });
      return;
    }

    job.lastRun = current;
    callback();
  };

  const timer = setInterval(runner, interval);
  job.timer = timer;
  runningScans.push(job);
  notify();
  return { id, schedule };
};

export const startStoredSchedules = (trigger: (id: string) => void) => {
  loadScheduledScans().forEach(({ id, schedule }) =>
    scheduleScan(id, schedule, () => trigger(id)),
  );
};

export const clearSchedules = () => {
  runningScans.forEach((j) => clearInterval(j.timer));
  runningScans.length = 0;
  persistSchedules([]);
  resetMetrics();
  notify();
};

export const configureScheduler = (update: {
  overloadLagMs?: number;
  minIntervalMs?: Partial<Record<SchedulerPriority, number>>;
  maxEventLog?: number;
}) => {
  if (typeof update.overloadLagMs === 'number') {
    schedulerConfig = {
      ...schedulerConfig,
      overloadLagMs: Math.max(0, update.overloadLagMs),
    };
  }

  if (typeof update.maxEventLog === 'number') {
    schedulerConfig = {
      ...schedulerConfig,
      maxEventLog: Math.max(1, Math.floor(update.maxEventLog)),
    };
    metrics.shedEvents = metrics.shedEvents.slice(0, schedulerConfig.maxEventLog);
  }

  if (update.minIntervalMs) {
    const updated: Record<SchedulerPriority, number> = {
      ...schedulerConfig.minIntervalMs,
    };
    (Object.keys(update.minIntervalMs) as SchedulerPriority[]).forEach((key) => {
      const value = update.minIntervalMs?.[key];
      if (typeof value === 'number' && !Number.isNaN(value)) {
        updated[key] = Math.max(0, value);
        runningScans.forEach((job) => {
          if (job.priority === key && !job.usesCustomMinInterval) {
            job.minInterval = Math.max(0, value);
          }
        });
      }
    });
    schedulerConfig = {
      ...schedulerConfig,
      minIntervalMs: updated,
    };
  }

  notify();
};

export const getSchedulerDiagnostics = (): SchedulerDiagnostics => ({
  config: {
    ...schedulerConfig,
    minIntervalMs: { ...schedulerConfig.minIntervalMs },
  },
  metrics: {
    overloadEvents: metrics.overloadEvents,
    lastLagMs: metrics.lastLagMs,
    lastOverloadAt: metrics.lastOverloadAt,
    inputExecutions: metrics.inputExecutions,
    lastInputLabel: metrics.lastInputLabel,
    lastInputDurationMs: metrics.lastInputDurationMs,
    shedEvents: [...metrics.shedEvents],
  },
  running: runningScans.map(({ id, schedule, priority, shedCount, label }) => ({
    id,
    schedule,
    priority,
    shedCount,
    label,
  })),
});

export const subscribeScheduler = (listener: Listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const runInputTask = <T>(label: string, task: () => T): T => {
  const start = now();
  try {
    return task();
  } finally {
    metrics.inputExecutions += 1;
    metrics.lastInputLabel = label;
    metrics.lastInputDurationMs = now() - start;
    notify();
  }
};

export const resetSchedulerConfig = () => {
  schedulerConfig = { ...defaultConfig };
  resetMetrics();
  notify();
};
