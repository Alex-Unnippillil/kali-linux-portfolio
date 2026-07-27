type IdleRequestCallback = (deadline: IdleDeadline) => void;

type IdleCallbackId = number;

interface IdleJobContext {
  shouldYield: () => boolean;
  signal: AbortSignal;
}

export interface IdleJobResult {
  done: boolean;
  processed?: number;
}

export interface IdleJobProgress {
  id: string;
  label?: string;
  completed: number;
  total?: number;
}

export interface IdleJobOptions {
  id: string;
  label?: string;
  total?: number;
  priority?: 'normal' | 'high';
  run: (context: IdleJobContext) => IdleJobResult | Promise<IdleJobResult>;
  onProgress?: (progress: IdleJobProgress) => void;
}

export interface IdleJobHandle {
  cancel: () => void;
}

export interface IdleQueueMetrics {
  blockedInputs: number;
  longestInputDelay: number;
  lastInputEvent: number;
  runningJobId: string | null;
  queuedJobs: number;
}

type MetricsListener = (metrics: IdleQueueMetrics) => void;

interface IdleJobInternal extends IdleJobOptions {
  controller: AbortController;
  completed: number;
}

const DEFAULT_CHUNK_BUDGET = 12;
const MAX_TIMEOUT = 1000;
const FALLBACK_FRAME = 16;
const INPUT_PAUSE_WINDOW = 150;

const globalScope =
  typeof globalThis !== 'undefined' ? (globalThis as Window & typeof globalThis) : undefined;

const isBrowser = Boolean(globalScope && 'document' in globalScope);

const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const supportsRequestIdleCallback = Boolean(globalScope?.requestIdleCallback);

const requestIdle = supportsRequestIdleCallback
  ? (cb: IdleRequestCallback): IdleCallbackId =>
      (globalScope!.requestIdleCallback as typeof requestIdleCallback)(cb, { timeout: MAX_TIMEOUT })
  : (cb: IdleRequestCallback): IdleCallbackId =>
      globalScope!.setTimeout(() => cb(createFallbackDeadline(DEFAULT_CHUNK_BUDGET)), FALLBACK_FRAME);

const cancelIdle = supportsRequestIdleCallback
  ? (id: IdleCallbackId) => (globalScope!.cancelIdleCallback as typeof cancelIdleCallback)(id)
  : (id: IdleCallbackId) => globalScope!.clearTimeout(id);

function createFallbackDeadline(budget: number): IdleDeadline {
  const start = now();
  return {
    didTimeout: false,
    timeRemaining: () => Math.max(0, budget - (now() - start)),
  } as IdleDeadline;
}

const hasPendingInput = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const sched = (navigator as unknown as { scheduling?: { isInputPending?: (opts?: { includeContinuous: boolean }) => boolean } }).scheduling;
  if (sched?.isInputPending) {
    try {
      return sched.isInputPending({ includeContinuous: true });
    } catch {
      return sched.isInputPending();
    }
  }
  return false;
};

export class IdleQueue {
  private jobs: IdleJobInternal[] = [];

  private pendingId: IdleCallbackId | null = null;

  private pendingType: 'idle' | 'timeout' | null = null;

  private pausedUntil = 0;

  private lastInput = 0;

  private metrics: IdleQueueMetrics = {
    blockedInputs: 0,
    longestInputDelay: 0,
    lastInputEvent: 0,
    runningJobId: null,
    queuedJobs: 0,
  };

  private metricsListeners = new Set<MetricsListener>();

  private currentJob: IdleJobInternal | null = null;

  private currentChunkStart = 0;

  constructor(private chunkBudget = DEFAULT_CHUNK_BUDGET) {
    if (!isBrowser) return;

    const handler = () => {
      this.lastInput = now();
      this.pausedUntil = this.lastInput + INPUT_PAUSE_WINDOW;
      this.metrics.lastInputEvent = this.lastInput;
      if (this.currentJob) {
        this.metrics.blockedInputs += 1;
        const delay = this.currentChunkStart ? now() - this.currentChunkStart : 0;
        if (delay > this.metrics.longestInputDelay) {
          this.metrics.longestInputDelay = delay;
        }
        this.emitMetrics();
      }
      if (this.pendingId !== null) {
        cancelIdle(this.pendingId);
        this.pendingId = null;
        this.pendingType = null;
      }
      this.schedule();
    };

    ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach((eventName) => {
      globalScope?.addEventListener(eventName, handler as EventListener, {
        passive: true,
        capture: true,
      });
    });
  }

  enqueue(options: IdleJobOptions): IdleJobHandle {
    if (!isBrowser) {
      return { cancel: () => undefined };
    }

    const controller = new AbortController();
    const job: IdleJobInternal = {
      ...options,
      controller,
      completed: 0,
    };

    if (options.priority === 'high') {
      this.jobs.unshift(job);
    } else {
      this.jobs.push(job);
    }

    this.updateQueueMetrics();
    this.schedule();

    return {
      cancel: () => {
        if (controller.signal.aborted) return;
        controller.abort();
        const idx = this.jobs.indexOf(job);
        if (idx >= 0) {
          this.jobs.splice(idx, 1);
        }
        if (this.currentJob === job) {
          this.currentJob = null;
        }
        this.updateQueueMetrics();
      },
    };
  }

  subscribe(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    listener({ ...this.metrics });
    return () => {
      this.metricsListeners.delete(listener);
    };
  }

  getMetrics(): IdleQueueMetrics {
    return { ...this.metrics };
  }

  private emitMetrics(): void {
    const snapshot = { ...this.metrics };
    this.metricsListeners.forEach((listener) => listener(snapshot));
    if (isBrowser) {
      (globalScope as unknown as { __idleQueueMetrics?: IdleQueueMetrics }).__idleQueueMetrics = snapshot;
    }
  }

  private updateQueueMetrics(): void {
    this.metrics.queuedJobs = this.jobs.length;
    this.metrics.runningJobId = this.currentJob?.id ?? null;
    this.emitMetrics();
  }

  private schedule(): void {
    if (!isBrowser) return;
    if (this.jobs.length === 0 || this.pendingId !== null || this.pendingType === 'timeout') return;

    const nowTime = now();
    if (this.pausedUntil > nowTime) {
      const delay = Math.max(0, this.pausedUntil - nowTime);
      this.pendingType = 'timeout';
      this.pendingId = globalScope!.setTimeout(() => {
        this.pendingType = null;
        this.pendingId = null;
        this.schedule();
      }, delay);
      return;
    }

    this.pendingType = supportsRequestIdleCallback ? 'idle' : 'timeout';
    if (supportsRequestIdleCallback) {
      this.pendingId = requestIdle((deadline) => this.handleIdle(deadline));
    } else {
      this.pendingId = requestIdle((deadline) => this.handleIdle(deadline));
    }
  }

  private handleIdle(deadline: IdleDeadline): void {
    this.pendingId = null;
    this.pendingType = null;

    if (this.jobs.length === 0) {
      this.updateQueueMetrics();
      return;
    }

    const maybePromise = this.processJobs(deadline);
    if (maybePromise && typeof (maybePromise as Promise<unknown>).then === 'function') {
      (maybePromise as Promise<void>)
        .catch((error) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error('Idle job failed', error);
          }
        })
        .finally(() => {
          this.currentJob = null;
          this.updateQueueMetrics();
          this.schedule();
        });
    } else {
      this.currentJob = null;
      this.updateQueueMetrics();
      this.schedule();
    }
  }

  private processJobs(deadline: IdleDeadline): void | Promise<void> {
    if (!this.jobs.length) return;

    if (this.shouldPauseForInput()) {
      this.schedule();
      return;
    }

    const job = this.jobs[0];

    if (job.controller.signal.aborted) {
      this.jobs.shift();
      return this.processJobs(deadline);
    }

    this.currentJob = job;
    this.currentChunkStart = now();
    this.metrics.runningJobId = job.id;
    this.emitMetrics();

    const budget = Math.max(1, Math.min(this.chunkBudget, this.safeTimeRemaining(deadline)));
    const chunkEnd = this.currentChunkStart + budget;

    const context: IdleJobContext = {
      signal: job.controller.signal,
      shouldYield: () => this.shouldYield(deadline, chunkEnd),
    };

    try {
      const result = job.run(context);
      if (result && typeof (result as PromiseLike<IdleJobResult>).then === 'function') {
        return (result as PromiseLike<IdleJobResult>)
          .then((value) => {
            this.onJobResult(job, value);
          })
          .catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
              console.error('Idle job failed', error);
            }
            this.jobs.shift();
          });
      }
      this.onJobResult(job, result as IdleJobResult);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Idle job failed', error);
      }
      this.jobs.shift();
    }
  }

  private onJobResult(job: IdleJobInternal, result: IdleJobResult): void {
    if (typeof result.processed === 'number' && !Number.isNaN(result.processed)) {
      job.completed += result.processed;
      const total = job.total ?? job.completed;
      job.onProgress?.({
        id: job.id,
        label: job.label,
        completed: Math.min(job.completed, total),
        total,
      });
    }

    if (result.done || job.controller.signal.aborted) {
      this.jobs.shift();
      const total = job.total ?? job.completed;
      job.onProgress?.({
        id: job.id,
        label: job.label,
        completed: total,
        total,
      });
    }
  }

  private shouldYield(deadline: IdleDeadline, chunkEnd: number): boolean {
    if (this.shouldPauseForInput()) return true;
    if (deadline.didTimeout) return false;
    if (this.safeTimeRemaining(deadline) <= 1) return true;
    return now() >= chunkEnd;
  }

  private shouldPauseForInput(): boolean {
    const nowTime = now();
    if (hasPendingInput()) return true;
    if (this.pausedUntil > nowTime) return true;
    if (this.lastInput && nowTime - this.lastInput < INPUT_PAUSE_WINDOW) return true;
    return false;
  }

  private safeTimeRemaining(deadline: IdleDeadline): number {
    try {
      return deadline.timeRemaining();
    } catch {
      return this.chunkBudget;
    }
  }
}

let sharedQueue: IdleQueue | null = null;

export const getIdleQueue = (): IdleQueue | null => {
  if (!isBrowser) return null;
  if (!sharedQueue) {
    sharedQueue = new IdleQueue();
  }
  return sharedQueue;
};

export default getIdleQueue;
