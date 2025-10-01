export type JobStatus = 'queued' | 'running' | 'completed' | 'paused' | 'failed' | 'cancelled';

export interface JobTypeConfig {
  /**
   * Human readable label shown in UI to describe the kind of work taking place.
   */
  label: string;
  /**
   * Maximum number of jobs allowed to run concurrently for this job type.
   */
  concurrency: number;
  /**
   * Optional hard limit on queued jobs waiting for a slot. If omitted the
   * queue may grow unbounded (in-memory only).
   */
  queueLimit?: number;
}

export interface JobMetadata {
  [key: string]: unknown;
}

export interface JobSnapshot {
  id: string;
  type: string;
  status: JobStatus;
  label?: string;
  metadata?: JobMetadata;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  /**
   * 1-based position in the queue for the current job type. Null when not
   * queued.
   */
  position: number | null;
  /**
   * Number of jobs currently running for this job type.
   */
  running: number;
  /**
   * Number of jobs currently waiting for this job type.
   */
  queued: number;
  concurrency: number;
  allowResume: boolean;
}

export interface BackpressureSnapshot {
  jobs: JobSnapshot[];
  jobTypes: Record<string, { config: JobTypeConfig; running: number; queued: number }>;
}

interface JobExecutor {
  run: () => Promise<void> | void;
  cancel?: () => void;
}

interface EnqueueOptions {
  id?: string;
  label?: string;
  metadata?: JobMetadata;
  allowResume?: boolean;
}

interface JobRecord extends EnqueueOptions, JobExecutor {
  id: string;
  type: string;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  allowResume: boolean;
  ignoreCompletion: boolean;
  resolve: () => void;
  reject: (err: unknown) => void;
  done: Promise<void>;
}

interface JobTypeState {
  config: JobTypeConfig;
  queue: JobRecord[];
  running: Set<JobRecord>;
}

const DEFAULT_JOB_TYPES: Record<string, JobTypeConfig> = {
  'hash:compute': { label: 'Hash conversion', concurrency: 1 },
  'openvas:scan': { label: 'OpenVAS scan', concurrency: 1 },
  'fixtures:parse': { label: 'Fixtures parsing', concurrency: 2 },
  'scanner:scheduled': { label: 'Scheduled scan trigger', concurrency: 1 },
};

let instance: BackpressureLimiter | null = null;

const ensureInstance = () => {
  if (!instance) instance = new BackpressureLimiter(DEFAULT_JOB_TYPES);
  return instance;
};

export interface JobHandle {
  id: string;
  type: string;
  done: Promise<void>;
  cancel: () => boolean;
  resume: () => boolean;
}

export class BackpressureLimiter {
  private registry = new Map<string, JobTypeState>();

  private jobs = new Map<string, JobRecord>();

  private listeners = new Set<(snapshot: BackpressureSnapshot) => void>();

  private counter = 0;

  constructor(defaults: Record<string, JobTypeConfig> = {}) {
    Object.entries(defaults).forEach(([type, config]) => this.registerType(type, config));
  }

  registerType(type: string, config: JobTypeConfig) {
    if (!config || typeof config.concurrency !== 'number' || config.concurrency < 1) {
      throw new Error('Concurrency must be >= 1');
    }
    const state = this.registry.get(type);
    if (state) {
      state.config = { ...state.config, ...config };
      this.notify();
      return;
    }
    this.registry.set(type, {
      config: { ...config },
      queue: [],
      running: new Set(),
    });
    this.notify();
  }

  enqueue(type: string, executor: JobExecutor, options: EnqueueOptions = {}): JobHandle {
    const state = this.ensureType(type);
    if (state.config.queueLimit && state.queue.length >= state.config.queueLimit) {
      throw new Error(`Queue limit reached for ${type}`);
    }

    const record: JobRecord = {
      ...options,
      ...executor,
      id: options.id ?? this.createId(type),
      type,
      status: 'queued',
      createdAt: Date.now(),
      allowResume: options.allowResume ?? true,
      ignoreCompletion: false,
      resolve: () => {},
      reject: () => {},
      done: Promise.resolve(undefined),
    } as JobRecord;

    record.done = new Promise<void>((resolve, reject) => {
      record.resolve = resolve;
      record.reject = reject;
    });

    state.queue.push(record);
    this.jobs.set(record.id, record);
    this.notify();
    this.process(type);

    return {
      id: record.id,
      type,
      done: record.done,
      cancel: () => this.cancel(record.id),
      resume: () => this.resume(record.id),
    };
  }

  cancel(id: string): boolean {
    const record = this.jobs.get(id);
    if (!record) return false;
    const state = this.registry.get(record.type);
    if (!state) return false;

    if (record.status === 'queued') {
      const idx = state.queue.indexOf(record);
      if (idx >= 0) state.queue.splice(idx, 1);
      record.status = record.allowResume ? 'paused' : 'cancelled';
      record.finishedAt = Date.now();
      if (!record.allowResume) {
        record.resolve();
        this.jobs.delete(id);
      }
      this.notify();
      return true;
    }

    if (record.status === 'running') {
      record.ignoreCompletion = true;
      record.cancel?.();
      state.running.delete(record);
      record.status = record.allowResume ? 'paused' : 'cancelled';
      record.finishedAt = Date.now();
      if (!record.allowResume) {
        record.resolve();
        this.jobs.delete(id);
      }
      this.notify();
      this.process(record.type);
      return true;
    }

    if (record.status === 'paused') {
      record.status = 'cancelled';
      record.finishedAt = Date.now();
      this.jobs.delete(id);
      record.resolve();
      this.notify();
      return true;
    }

    return false;
  }

  resume(id: string): boolean {
    const record = this.jobs.get(id);
    if (!record) return false;
    if (record.status !== 'paused') return false;
    const state = this.ensureType(record.type);
    record.status = 'queued';
    record.ignoreCompletion = false;
    record.finishedAt = undefined;
    state.queue.push(record);
    this.notify();
    this.process(record.type);
    return true;
  }

  subscribe(listener: (snapshot: BackpressureSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): BackpressureSnapshot {
    const jobTypes: BackpressureSnapshot['jobTypes'] = {};

    this.registry.forEach((state, type) => {
      jobTypes[type] = {
        config: { ...state.config },
        running: state.running.size,
        queued: state.queue.length,
      };
    });

    const jobs: JobSnapshot[] = Array.from(this.jobs.values()).map((job) => {
      const state = this.registry.get(job.type)!;
      const position = job.status === 'queued' ? state.queue.indexOf(job) : -1;
      return {
        id: job.id,
        type: job.type,
        status: job.status,
        label: job.label,
        metadata: job.metadata,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        error: job.error,
        position: position >= 0 ? position + 1 : null,
        running: state.running.size,
        queued: state.queue.length,
        concurrency: state.config.concurrency,
        allowResume: job.allowResume,
      };
    });

    jobs.sort((a, b) => a.createdAt - b.createdAt);

    return { jobs, jobTypes };
  }

  reset() {
    this.registry.forEach((state) => {
      state.queue.length = 0;
      state.running.clear();
    });
    this.jobs.clear();
    this.notify();
  }

  private ensureType(type: string): JobTypeState {
    const state = this.registry.get(type);
    if (state) return state;
    const fallback = DEFAULT_JOB_TYPES[type];
    if (!fallback) {
      throw new Error(`Job type ${type} is not registered`);
    }
    this.registerType(type, fallback);
    return this.registry.get(type)!;
  }

  private process(type: string) {
    const state = this.registry.get(type);
    if (!state) return;

    while (
      state.running.size < state.config.concurrency &&
      state.queue.length > 0
    ) {
      const job = state.queue.shift()!;
      this.startJob(job, state);
    }
  }

  private startJob(job: JobRecord, state: JobTypeState) {
    job.status = 'running';
    job.startedAt = Date.now();
    job.ignoreCompletion = false;
    state.running.add(job);
    this.notify();

    Promise.resolve()
      .then(() => job.run())
      .then(() => {
        if (job.ignoreCompletion) return;
        if (job.status === 'running') {
          job.status = 'completed';
          job.finishedAt = Date.now();
          job.resolve();
        }
      })
      .catch((err) => {
        if (job.ignoreCompletion) return;
        job.status = 'failed';
        job.error = err instanceof Error ? err.message : String(err);
        job.finishedAt = Date.now();
        job.reject(err);
      })
      .finally(() => {
        if (!state.running.has(job)) return;
        state.running.delete(job);
        if (job.status === 'completed' || job.status === 'failed') {
          this.jobs.delete(job.id);
        }
        this.notify();
        this.process(job.type);
      });
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private createId(type: string) {
    const globalCrypto =
      typeof globalThis !== 'undefined' && typeof (globalThis as any).crypto !== 'undefined'
        ? (globalThis as any).crypto
        : undefined;
    if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
      return `${type}:${globalCrypto.randomUUID().slice(0, 8)}`;
    }
    this.counter += 1;
    return `${type}:${this.counter}`;
  }
}

export const registerJobType = (
  type: string,
  config: JobTypeConfig,
): void => {
  ensureInstance().registerType(type, config);
};

export const enqueueJob = (
  type: string,
  executor: JobExecutor,
  options?: EnqueueOptions,
): JobHandle => ensureInstance().enqueue(type, executor, options);

export const cancelJob = (id: string): boolean => ensureInstance().cancel(id);

export const resumeJob = (id: string): boolean => ensureInstance().resume(id);

export const subscribeToBackpressure = (
  listener: (snapshot: BackpressureSnapshot) => void,
): (() => void) => ensureInstance().subscribe(listener);

export const getBackpressureSnapshot = (): BackpressureSnapshot =>
  ensureInstance().getSnapshot();

export const resetBackpressureForTests = () => {
  ensureInstance().reset();
};
