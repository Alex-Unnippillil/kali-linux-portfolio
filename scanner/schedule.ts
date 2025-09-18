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
  callback: () => void,
): ScheduledScan => {
  const jobs = loadScheduledScans().filter((job) => job.id !== id);
  jobs.push({ id, schedule });
  persistSchedules(jobs);
  const existingIndex = runningScans.findIndex((job) => job.id === id);
  if (existingIndex >= 0) {
    clearInterval(runningScans[existingIndex].timer);
    runningScans.splice(existingIndex, 1);
  }
  const interval = cronToInterval(schedule);
  const timer = setInterval(callback, interval);
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

export const cancelSchedule = (id: string): void => {
  const index = runningScans.findIndex((job) => job.id === id);
  if (index >= 0) {
    clearInterval(runningScans[index].timer);
    runningScans.splice(index, 1);
  }
  const stored = loadScheduledScans();
  const filtered = stored.filter((job) => job.id !== id);
  if (filtered.length !== stored.length) {
    persistSchedules(filtered);
  }
};
