export type TransferMode = 'parallel' | 'queued';

export type TransferStatus = 'queued' | 'copying' | 'paused' | 'completed';

export interface TransferJob {
  id: number;
  run: () => Promise<void>;
  pause?: () => void;
  resume?: () => void;
  status: TransferStatus;
}

type Listener = () => void;

export class TransferManager {
  private mode: TransferMode = 'parallel';
  private queue: TransferJob[] = [];
  private active: TransferJob[] = [];
  private paused: TransferJob[] = [];
  private listeners: Set<Listener> = new Set();
  private nextId = 1;

  setMode(mode: TransferMode) {
    this.mode = mode;
  }

  start(job: Omit<TransferJob, 'id' | 'status'>): TransferJob {
    const full: TransferJob = { ...job, id: this.nextId++, status: 'queued' };
    if (this.mode === 'parallel' || this.active.length === 0) {
      this.run(full);
    } else {
      this.queue.push(full);
      this.notify();
    }
    return full;
  }

  pause(job: TransferJob) {
    if (job.status === 'copying') {
      job.pause?.();
      job.status = 'paused';
      this.active = this.active.filter((j) => j.id !== job.id);
      this.paused.push(job);
      this.notify();
      if (this.mode === 'queued' && this.queue.length > 0) {
        this.run(this.queue.shift()!);
      }
    }
  }

  resume(job: TransferJob) {
    if (job.status === 'paused') {
      this.paused = this.paused.filter((j) => j.id !== job.id);
      if (this.mode === 'queued' && this.active.length > 0) {
        job.status = 'queued';
        this.queue.push(job);
        this.notify();
      } else {
        this.run(job);
      }
    }
  }

  getSummary(): string {
    const copying = this.active.length;
    const queued = this.queue.length;
    let summary = `Copying ${copying}`;
    if (queued > 0) summary += `, Queued ${queued}`;
    return summary;
  }

  getJobs(): TransferJob[] {
    return [...this.active, ...this.queue, ...this.paused];
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const l of this.listeners) l();
  }

  private run(job: TransferJob) {
    job.status = 'copying';
    this.active.push(job);
    this.notify();
    job.run().finally(() => {
      job.status = 'completed';
      this.active = this.active.filter((j) => j.id !== job.id);
      this.notify();
      if (this.mode === 'queued' && this.queue.length > 0) {
        this.run(this.queue.shift()!);
      }
    });
  }
}

