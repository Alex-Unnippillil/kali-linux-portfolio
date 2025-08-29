export type ScanCallback = () => void;

interface StoredJob {
  id: string;
  cron: string;
}

interface Job extends StoredJob {
  callback: ScanCallback;
  lastRun?: number;
}

const STORAGE_KEY = 'scanSchedules';

function parseField(field: string, value: number): boolean {
  if (field === '*' || field === undefined) return true;
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    if (!step) return false;
    return value % step === 0;
  }
  return field.split(',').some((part) => parseInt(part, 10) === value);
}

function cronMatch(expr: string, date: Date): boolean {
  const [min, hour, dom, month, dow] = expr.trim().split(/\s+/);
  return (
    parseField(min, date.getMinutes()) &&
    parseField(hour, date.getHours()) &&
    parseField(dom, date.getDate()) &&
    parseField(month, date.getMonth() + 1) &&
    parseField(dow, date.getDay())
  );
}

export class ScanScheduler {
  private jobs: Job[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadStoredJobs();
  }

  private loadStoredJobs() {
    if (typeof window === 'undefined') return;
    try {
      const stored: StoredJob[] = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );
      stored.forEach((j) =>
        this.jobs.push({ ...j, callback: () => {}, lastRun: undefined })
      );
    } catch {
      /* ignore */
    }
  }

  private saveJobs() {
    if (typeof window === 'undefined') return;
    const stored: StoredJob[] = this.jobs.map(({ id, cron }) => ({ id, cron }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }

  addScan(id: string, cron: string, callback: ScanCallback) {
    this.jobs.push({ id, cron, callback });
    this.saveJobs();
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.check(), 60 * 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private check() {
    const now = new Date();
    for (const job of this.jobs) {
      if (
        cronMatch(job.cron, now) &&
        (!job.lastRun || now.getTime() - job.lastRun >= 60 * 1000)
      ) {
        job.lastRun = now.getTime();
        try {
          job.callback();
        } catch {
          /* swallow */
        }
      }
    }
  }
}

export default ScanScheduler;
