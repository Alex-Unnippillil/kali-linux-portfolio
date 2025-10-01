import { enqueueJob } from '../utils/backpressure';

export interface ScheduledScan {
  id: string;
  schedule: string;
}

interface RunningScan extends ScheduledScan {
  timer: ReturnType<typeof setInterval>;
  callback: () => void;
}

const STORAGE_KEY = 'scanSchedules';
const runningScans: RunningScan[] = [];

export interface ScheduleOptions {
  jobType?: string;
  label?: string;
  metadata?: Record<string, unknown>;
  allowResume?: boolean;
}

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
  callback: () => void | Promise<void>,
  options: ScheduleOptions = {},
): ScheduledScan => {
  const jobs = loadScheduledScans();
  jobs.push({ id, schedule });
  persistSchedules(jobs);
  const interval = cronToInterval(schedule);
  const run = () => {
    if (options.jobType) {
      enqueueJob(
        options.jobType,
        {
          run: async () => {
            await Promise.resolve(callback());
          },
        },
        {
          label: options.label ?? `Scheduled scan ${id}`,
          metadata: { id, schedule, ...(options.metadata || {}) },
          allowResume: options.allowResume ?? false,
        },
      );
    } else {
      callback();
    }
  };
  const timer = setInterval(run, interval);
  runningScans.push({ id, schedule, timer, callback });
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
};
