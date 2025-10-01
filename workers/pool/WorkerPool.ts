import {
  WorkerMessageType,
  type WorkerOutgoingMessage,
} from './messages';
import type {
  EnqueueJobOptions,
  EnqueuedJob,
  InternalJob,
  WorkerInstance,
  WorkerJobSnapshot,
  WorkerPoolEvent,
  WorkerPoolEventMap,
  WorkerPoolListener,
  WorkerRegistration,
} from './types';

interface ActiveJob {
  job: InternalJob<any, any, any>;
  instance: WorkerInstance;
  messageListener: (event: MessageEvent<WorkerOutgoingMessage<any, any>>) => void;
  errorListener: (event: ErrorEvent) => void;
}

interface RegisteredWorker extends WorkerRegistration {
  instances: WorkerInstance[];
  maxConcurrency: number;
}

const DEFAULT_CANCEL_ERROR = () =>
  new DOMException('Job cancelled', 'AbortError');

const DEFAULT_MAX_CONCURRENCY = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.max(2, Math.floor(navigator.hardwareConcurrency * 0.75));
  }
  return 4;
};

let workerIdCounter = 0;
let jobCounter = 0;

export class WorkerPool {
  private readonly workers = new Map<string, RegisteredWorker>();
  private readonly listeners = new Set<WorkerPoolListener>();
  private readonly jobQueue: InternalJob<any, any, any>[] = [];
  private readonly activeJobs = new Map<string, ActiveJob>();
  private readonly cancellationError = DEFAULT_CANCEL_ERROR;

  registerWorker<TPayload, TResult, TProgress>(
    registration: WorkerRegistration<TPayload, TResult, TProgress>,
  ) {
    const existing = this.workers.get(registration.name);
    const maxConcurrency =
      registration.maxConcurrency ?? existing?.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY();
    const instances = existing?.instances ?? [];
    if (!existing) {
      instances.length = 0;
    }
    this.workers.set(registration.name, {
      ...registration,
      instances,
      maxConcurrency,
    });
  }

  enqueue<TPayload, TResult, TProgress>(
    options: EnqueueJobOptions<TPayload, TResult, TProgress>,
  ): EnqueuedJob<TResult> {
    const registration = this.workers.get(options.worker);
    if (!registration) {
      throw new Error(
        `Worker "${options.worker}" has not been registered with the pool`,
      );
    }

    const jobId = `${options.worker}-${Date.now()}-${++jobCounter}`;
    let resolve!: (value: TResult) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<TResult>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const job: InternalJob<TPayload, TResult, TProgress> = {
      ...options,
      jobId,
      createdAt: Date.now(),
      resolve,
      reject,
      cancelled: false,
    };

    if (options.signal) {
      if (options.signal.aborted) {
        job.cancelled = true;
        reject(this.cancellationError());
        this.emit('job-cancelled', this.createSnapshot(job, 'cancelled'));
        return { jobId, promise, cancel: () => {} };
      }
      const abortListener = () => {
        this.cancelJob(jobId);
      };
      options.signal.addEventListener('abort', abortListener, { once: true });
      const originalResolve = resolve;
      const originalReject = reject;
      job.resolve = (value: TResult) => {
        options.signal?.removeEventListener('abort', abortListener);
        originalResolve(value);
      };
      job.reject = (reason?: any) => {
        options.signal?.removeEventListener('abort', abortListener);
        originalReject(reason);
      };
    }

    this.jobQueue.push(job);
    this.sortQueue();
    this.emit('job-queued', this.createSnapshot(job, 'queued'));
    this.schedule();

    return {
      jobId,
      promise,
      cancel: () => this.cancelJob(jobId),
    };
  }

  cancelJob(jobId: string) {
    const queuedIndex = this.jobQueue.findIndex((job) => job.jobId === jobId);
    if (queuedIndex !== -1) {
      const [job] = this.jobQueue.splice(queuedIndex, 1);
      job.cancelled = true;
      job.reject(this.cancellationError());
      this.emit('job-cancelled', this.createSnapshot(job, 'cancelled'));
      return true;
    }

    const active = this.activeJobs.get(jobId);
    if (!active) return false;

    const { job, instance } = active;
    job.cancelled = true;
    this.detachListeners(active);
    try {
      instance.worker.postMessage({
        type: WorkerMessageType.Cancel,
        jobId,
      });
    } catch {
      // Ignore postMessage errors during cancellation.
    }
    instance.worker.terminate();
    this.replaceInstance(job.worker, instance);
    job.reject(this.cancellationError());
    this.emit('job-cancelled', this.createSnapshot(job, 'cancelled'));
    this.activeJobs.delete(jobId);
    this.schedule();
    return true;
  }

  addListener(listener: WorkerPoolListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private replaceInstance(workerName: string, instance: WorkerInstance) {
    const registration = this.workers.get(workerName);
    if (!registration) return;
    instance.worker = registration.create();
    instance.currentJobId = undefined;
  }

  private schedule() {
    this.sortQueue();
    for (let i = 0; i < this.jobQueue.length; i++) {
      const job = this.jobQueue[i];
      if (job.cancelled) {
        this.jobQueue.splice(i, 1);
        i--;
        continue;
      }
      const started = this.tryStartJob(job);
      if (started) {
        this.jobQueue.splice(i, 1);
        i--;
      }
    }
  }

  private sortQueue() {
    this.jobQueue.sort((a, b) => {
      const priorityA = a.priority ?? 0;
      const priorityB = b.priority ?? 0;
      if (priorityA === priorityB) {
        return a.createdAt - b.createdAt;
      }
      return priorityB - priorityA;
    });
  }

  private tryStartJob(job: InternalJob<any, any, any>) {
    const registration = this.workers.get(job.worker);
    if (!registration) {
      job.reject(new Error(`Worker "${job.worker}" is not registered`));
      this.emit('job-error', this.createSnapshot(job, 'error', { error: 'Worker not registered' }));
      return true;
    }

    let instance = registration.instances.find((inst) => !inst.currentJobId);
    if (!instance) {
      if (registration.instances.length >= registration.maxConcurrency) {
        return false;
      }
      instance = this.createInstance(registration);
      registration.instances.push(instance);
    }

    instance.currentJobId = job.jobId;
    const active: ActiveJob = {
      job,
      instance,
      messageListener: (event) => this.onWorkerMessage(job.jobId, event),
      errorListener: (event) => this.onWorkerError(job.jobId, event),
    };
    this.activeJobs.set(job.jobId, active);

    instance.worker.addEventListener('message', active.messageListener as EventListener);
    instance.worker.addEventListener('error', active.errorListener as EventListener);

    job.onStart?.();
    this.emit('job-started', this.createSnapshot(job, 'running'));

    try {
      instance.worker.postMessage(
        {
          type: WorkerMessageType.Execute,
          jobId: job.jobId,
          payload: job.payload,
        },
        job.transfer ?? [],
      );
    } catch (error) {
      this.failJob(job.jobId, error instanceof Error ? error.message : 'Worker postMessage failed');
    }

    return true;
  }

  private createInstance(registration: RegisteredWorker): WorkerInstance {
    const worker = registration.create();
    return {
      id: `${registration.name}-w${++workerIdCounter}`,
      worker,
    };
  }

  private onWorkerMessage(jobId: string, event: MessageEvent<WorkerOutgoingMessage<any, any>>) {
    const active = this.activeJobs.get(jobId);
    if (!active) return;
    const { job } = active;
    const message = event.data;
    if (!message || message.jobId !== jobId) return;

    switch (message.type) {
      case WorkerMessageType.Progress: {
        if (job.cancelled) return;
        job.onProgress?.(message.progress);
        this.emit(
          'job-progress',
          this.createSnapshot(job, 'running', { progress: message.progress }),
        );
        break;
      }
      case WorkerMessageType.Result: {
        if (job.cancelled) return;
        this.completeJob(jobId, message.result);
        break;
      }
      case WorkerMessageType.Error: {
        if (job.cancelled) return;
        this.failJob(jobId, message.error ?? 'Worker error');
        break;
      }
      default:
        break;
    }
  }

  private onWorkerError(jobId: string, event: ErrorEvent) {
    if (!this.activeJobs.has(jobId)) return;
    this.failJob(jobId, event.message || 'Worker execution error');
  }

  private completeJob(jobId: string, result: any) {
    const active = this.activeJobs.get(jobId);
    if (!active) return;
    const { job, instance } = active;
    this.detachListeners(active);
    instance.currentJobId = undefined;
    this.activeJobs.delete(jobId);
    job.resolve(result);
    this.emit(
      'job-complete',
      this.createSnapshot(job, 'completed', { result }),
    );
    this.schedule();
  }

  private failJob(jobId: string, error: string) {
    const active = this.activeJobs.get(jobId);
    if (!active) return;
    const { job, instance } = active;
    this.detachListeners(active);
    instance.currentJobId = undefined;
    this.activeJobs.delete(jobId);
    job.reject(new Error(error));
    this.emit('job-error', this.createSnapshot(job, 'error', { error }));
    this.schedule();
  }

  private detachListeners(active: ActiveJob) {
    const { instance, messageListener, errorListener } = active;
    instance.worker.removeEventListener('message', messageListener as EventListener);
    instance.worker.removeEventListener('error', errorListener as EventListener);
  }

  private emit<K extends WorkerPoolEvent>(
    event: K,
    snapshot: WorkerPoolEventMap[K],
  ) {
    this.listeners.forEach((listener) => listener(event, snapshot));
  }

  private createSnapshot(
    job: InternalJob<any, any, any>,
    status: WorkerJobSnapshot['status'],
    extras: Partial<WorkerJobSnapshot> = {},
  ): WorkerJobSnapshot {
    return {
      id: job.jobId,
      worker: job.worker,
      status,
      ...extras,
    };
  }
}

export const workerPool = new WorkerPool();
