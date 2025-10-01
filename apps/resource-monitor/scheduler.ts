export type AutoPauseReason =
  | null
  | {
      type: 'cpu';
      usage: number;
      threshold: number;
    };

export interface SchedulerSnapshot {
  queued: number;
  running: number;
  completed: number;
  maxParallel: number;
  userPaused: boolean;
  autoPaused: boolean;
  autoPauseReason: AutoPauseReason;
}

interface SchedulerOptions {
  maxParallel: number;
  cpuThreshold: number;
  resumeThreshold?: number;
  onStateChange: (snapshot: SchedulerSnapshot) => void;
}

interface Job {
  id: number;
  duration: number;
  timeout?: ReturnType<typeof setTimeout>;
}

const DEFAULT_RESUME_HYSTERESIS = 20;

export class JobScheduler {
  private queue: Job[] = [];
  private running = new Map<number, Job>();
  private completed = 0;
  private jobCounter = 0;
  private maxParallel: number;
  private userPaused = false;
  private autoPauseReason: AutoPauseReason = null;
  private readonly cpuThreshold: number;
  private readonly resumeThreshold: number;
  private readonly onStateChange: (snapshot: SchedulerSnapshot) => void;
  private disposed = false;

  constructor({
    maxParallel,
    cpuThreshold,
    resumeThreshold,
    onStateChange,
  }: SchedulerOptions) {
    this.maxParallel = Math.max(1, maxParallel);
    this.cpuThreshold = cpuThreshold;
    this.resumeThreshold =
      typeof resumeThreshold === 'number'
        ? resumeThreshold
        : Math.max(10, cpuThreshold - DEFAULT_RESUME_HYSTERESIS);
    this.onStateChange = onStateChange;
    this.emit();
  }

  enqueueJobs(count: number) {
    for (let i = 0; i < count; i += 1) {
      const job: Job = {
        id: ++this.jobCounter,
        duration: 800 + Math.floor(Math.random() * 2200),
      };
      this.queue.push(job);
    }
    this.emit();
    this.tryStartJobs();
  }

  setMaxParallel(limit: number) {
    const clamped = Math.max(1, Math.round(limit));
    if (clamped === this.maxParallel) return;
    this.maxParallel = clamped;
    this.emit();
    this.tryStartJobs();
  }

  pauseUser() {
    if (this.userPaused) return;
    this.userPaused = true;
    this.emit();
  }

  resumeUser() {
    if (!this.userPaused) return;
    this.userPaused = false;
    this.emit();
    this.tryStartJobs();
  }

  updateCpuUsage(usage: number) {
    if (Number.isNaN(usage)) return;
    if (usage >= this.cpuThreshold) {
      this.setAutoPause({ type: 'cpu', usage, threshold: this.cpuThreshold });
    } else if (this.autoPauseReason && usage <= this.resumeThreshold) {
      this.setAutoPause(null);
    } else if (this.autoPauseReason?.type === 'cpu') {
      // Update the usage shown in the reason to provide fresh context.
      this.autoPauseReason = {
        type: 'cpu',
        usage,
        threshold: this.autoPauseReason.threshold,
      };
      this.emit();
    }
  }

  dispose() {
    this.disposed = true;
    this.running.forEach((job) => {
      if (job.timeout) clearTimeout(job.timeout);
    });
    this.queue.forEach((job) => {
      if (job.timeout) clearTimeout(job.timeout);
    });
    this.running.clear();
    this.queue = [];
  }

  getState(): SchedulerSnapshot {
    return {
      queued: this.queue.length,
      running: this.running.size,
      completed: this.completed,
      maxParallel: this.maxParallel,
      userPaused: this.userPaused,
      autoPaused: !!this.autoPauseReason,
      autoPauseReason: this.autoPauseReason,
    };
  }

  private setAutoPause(reason: AutoPauseReason) {
    const previouslyPaused = !!this.autoPauseReason;
    this.autoPauseReason = reason;
    if (!reason && previouslyPaused) {
      this.emit();
      this.tryStartJobs();
    } else if (reason) {
      this.emit();
    }
  }

  private tryStartJobs() {
    if (this.disposed) return;
    while (
      !this.isPaused() &&
      this.running.size < this.maxParallel &&
      this.queue.length > 0
    ) {
      const job = this.queue.shift();
      if (!job) break;
      this.startJob(job);
    }
  }

  private startJob(job: Job) {
    this.running.set(job.id, job);
    this.emit();
    job.timeout = setTimeout(() => {
      this.finishJob(job.id);
    }, job.duration);
  }

  private finishJob(id: number) {
    const job = this.running.get(id);
    if (!job) return;
    this.running.delete(id);
    this.completed += 1;
    this.emit();
    this.tryStartJobs();
  }

  private isPaused() {
    return this.userPaused || !!this.autoPauseReason;
  }

  private emit() {
    this.onStateChange(this.getState());
  }
}

export const createJobScheduler = (options: SchedulerOptions) =>
  new JobScheduler(options);
