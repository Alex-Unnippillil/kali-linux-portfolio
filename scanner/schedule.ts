import {
  getCachedCapabilities,
  loadCapabilities,
  onCapabilitiesChange,
  type DeviceCapabilities,
} from '../utils/capabilities';

export interface ScheduledScan {
  id: string;
  schedule: string;
}

type ScanCallback = () => void | Promise<void>;

interface RunningScan extends ScheduledScan {
  timer: ReturnType<typeof setInterval> | null;
  callback: ScanCallback;
  active: boolean;
  remainingDelay: number;
}

const STORAGE_KEY = 'scanSchedules';
const runningScans: RunningScan[] = [];

const getWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = (globalThis as typeof globalThis & { window?: Window }).window;
  return candidate;
};

const getStorage = () => {
  const win = getWindow();
  if (!win) return null;
  try {
    return win.localStorage;
  } catch {
    return null;
  }
};

const schedulerState = {
  intervalMultiplier: 1,
  maxConcurrency: Number.POSITIVE_INFINITY,
};

let testCapabilitiesOverride: DeviceCapabilities | null = null;

const applyCapabilities = (caps: DeviceCapabilities) => {
  schedulerState.intervalMultiplier = Math.max(1, caps.performance.intervalMultiplier || 1);
  schedulerState.maxConcurrency = caps.performance.shouldThrottle
    ? Math.max(1, caps.performance.maxConcurrency || 1)
    : Math.max(1, caps.performance.maxConcurrency || Number.POSITIVE_INFINITY);
};

applyCapabilities(getCachedCapabilities());

onCapabilitiesChange(applyCapabilities);

if (getWindow()) {
  void loadCapabilities().catch(() => {});
}

const countActiveJobs = () => runningScans.reduce((count, job) => count + (job.active ? 1 : 0), 0);

const executeJob = (job: RunningScan) => {
  if (job.active) return;
  try {
    const result = job.callback();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      job.active = true;
      (result as Promise<unknown>).finally(() => {
        job.active = false;
      });
    }
  } catch (error) {
    if (typeof console !== 'undefined' && error) {
      console.warn('Scheduled scan failed', error);
    }
  }
};

export const loadScheduledScans = (): ScheduledScan[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const persistSchedules = (jobs: ScheduledScan[]) => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(jobs));
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
  callback: ScanCallback,
): ScheduledScan => {
  const caps = testCapabilitiesOverride ?? getCachedCapabilities();
  applyCapabilities(caps);
  const jobs = loadScheduledScans();
  jobs.push({ id, schedule });
  persistSchedules(jobs);
  const baseInterval = cronToInterval(schedule);
  const effectiveInterval = Math.max(
    1,
    Math.round(baseInterval * (caps.performance.intervalMultiplier || 1)),
  );
  const job: RunningScan = {
    id,
    schedule,
    callback,
    timer: null,
    active: false,
    remainingDelay: effectiveInterval,
  };

  const tick = () => {
    const tickCaps = testCapabilitiesOverride ?? getCachedCapabilities();
    applyCapabilities(tickCaps);
    const nextInterval = Math.max(
      1,
      Math.round(baseInterval * (tickCaps.performance.intervalMultiplier || 1)),
    );
    job.remainingDelay -= baseInterval;
    if (job.remainingDelay > 0) return;
    if (countActiveJobs() >= schedulerState.maxConcurrency) {
      job.remainingDelay = Math.max(baseInterval, job.remainingDelay + baseInterval);
      return;
    }
    executeJob(job);
    job.remainingDelay = nextInterval;
  };

  job.timer = setInterval(tick, baseInterval);
  runningScans.push(job);
  return { id, schedule };
};

export const startStoredSchedules = (trigger: (id: string) => void) => {
  loadScheduledScans().forEach(({ id, schedule }) =>
    scheduleScan(id, schedule, () => trigger(id)),
  );
};

export const clearSchedules = () => {
  runningScans.forEach((j) => {
    if (j.timer) clearInterval(j.timer);
    j.timer = null;
    j.active = false;
    j.remainingDelay = 0;
  });
  runningScans.length = 0;
  persistSchedules([]);
};

export const __getSchedulerStateForTests = () => schedulerState;
export const __applyCapabilitiesForTests = applyCapabilities;
export const __getRunningScansForTests = () => runningScans;
export const __setTestCapabilitiesOverride = (caps: DeviceCapabilities | null) => {
  testCapabilitiesOverride = caps;
  if (caps) applyCapabilities(caps);
};
export const __attemptExecuteForTests = (index: number) => {
  const job = runningScans[index];
  if (!job) return false;
  if (countActiveJobs() >= schedulerState.maxConcurrency) return false;
  executeJob(job);
  return true;
};
