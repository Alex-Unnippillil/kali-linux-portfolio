import type { DiffPayloadMap, DiffMode, DiffResult } from './types';
import {
  DiffWorkerRequestMessage,
  DiffWorkerResponseMessage,
  ArrayDiffPayload,
  JsonDiffPayload,
  TextDiffPayload,
} from './types';
import { diffArray } from './arrayDiff';
import { diffJson } from './jsonDiff';
import { diffText } from './textDiff';

const createAbortError = () => {
  try {
    return new DOMException('The diff task was aborted', 'AbortError');
  } catch (error) {
    const abortError = new Error('The diff task was aborted');
    abortError.name = 'AbortError';
    return abortError;
  }
};

type WorkerLike = Pick<Worker, 'postMessage' | 'terminate'> & {
  onmessage: ((event: MessageEvent<DiffWorkerResponseMessage>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
};

type Job = {
  id: string;
  mode: DiffMode;
  payload: DiffPayloadMap[DiffMode];
  resolve: (result: DiffResult) => void;
  reject: (error: unknown) => void;
  cleanup?: () => void;
};

type WorkerHandle = {
  worker: WorkerLike;
  busy: boolean;
  jobId?: string;
};

const createDefaultWorker = (): Worker => {
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this environment');
  }
  return new Worker(new URL('../../workers/diff.worker.ts', import.meta.url));
};

const DEFAULT_POOL_SIZE = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    return Math.max(1, Math.min(4, Math.floor(navigator.hardwareConcurrency / 2)));
  }
  return 2;
};

export const runDiff = (mode: DiffMode, payload: DiffPayloadMap[DiffMode]): DiffResult => {
  switch (mode) {
    case 'text':
      return { kind: 'text', segments: diffText((payload as TextDiffPayload).left, (payload as TextDiffPayload).right) };
    case 'json':
      return { kind: 'json', changes: diffJson((payload as JsonDiffPayload).left, (payload as JsonDiffPayload).right) };
    case 'array':
      return { kind: 'array', changes: diffArray((payload as ArrayDiffPayload).left, (payload as ArrayDiffPayload).right) };
    default: {
      const exhaustive: never = mode;
      throw new Error(`Unsupported diff mode: ${String(exhaustive)}`);
    }
  }
};

const bindWorkerHandlers = (
  handle: WorkerHandle,
  onMessage: (handle: WorkerHandle, event: MessageEvent<DiffWorkerResponseMessage>) => void,
  onError: (handle: WorkerHandle, event: ErrorEvent) => void,
) => {
  handle.worker.onmessage = event => onMessage(handle, event);
  handle.worker.onerror = event => onError(handle, event);
};

interface DiffWorkerPoolOptions {
  size?: number;
  createWorker?: () => WorkerLike;
}

export class DiffWorkerPool {
  private readonly size: number;

  private readonly createWorker: () => WorkerLike;

  private readonly workers: WorkerHandle[] = [];

  private readonly queue: Job[] = [];

  private readonly pending = new Map<string, Job>();

  constructor(options: DiffWorkerPoolOptions = {}) {
    this.size = options.size ?? DEFAULT_POOL_SIZE();
    this.createWorker = options.createWorker ?? (createDefaultWorker as () => WorkerLike);

    for (let i = 0; i < this.size; i += 1) {
      this.workers.push(this.createHandle());
    }
  }

  private createHandle(): WorkerHandle {
    const worker = this.createWorker();
    const handle: WorkerHandle = { worker, busy: false };
    bindWorkerHandlers(handle, this.handleMessage, this.handleError);
    return handle;
  }

  private handleMessage = (handle: WorkerHandle, event: MessageEvent<DiffWorkerResponseMessage>) => {
    const message = event.data;
    const job = message?.id ? this.pending.get(message.id) : undefined;
    if (!job) {
      return;
    }
    this.pending.delete(job.id);
    job.cleanup?.();
    handle.busy = false;
    handle.jobId = undefined;
    this.dispatch();

    if (message.status === 'success') {
      job.resolve(message.result);
    } else if (message.status === 'error') {
      job.reject(new Error(message.error));
    } else if (message.status === 'cancelled') {
      job.reject(createAbortError());
    }
  };

  private handleError = (handle: WorkerHandle, event: ErrorEvent) => {
    if (handle.jobId) {
      const job = this.pending.get(handle.jobId);
      if (job) {
        this.pending.delete(handle.jobId);
        job.cleanup?.();
        job.reject(event.error ?? new Error(event.message));
      }
    }
    this.replaceWorker(handle);
    this.dispatch();
  };

  private replaceWorker(handle: WorkerHandle) {
    try {
      handle.worker.terminate();
    } catch (error) {
      // Ignore termination errors.
    }
    const worker = this.createWorker();
    handle.worker = worker;
    handle.busy = false;
    handle.jobId = undefined;
    bindWorkerHandlers(handle, this.handleMessage, this.handleError);
  }

  run<TMode extends DiffMode>(
    mode: TMode,
    payload: DiffPayloadMap[TMode],
    signal?: AbortSignal,
  ): Promise<DiffResult> {
    if (signal?.aborted) {
      return Promise.reject(createAbortError());
    }

    const id = `diff-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return new Promise<DiffResult>((resolve, reject) => {
      const job: Job = {
        id,
        mode,
        payload: payload as DiffPayloadMap[DiffMode],
        resolve,
        reject,
      };

      const abortHandler = () => {
        if (job.cleanup) {
          const cleanup = job.cleanup;
          job.cleanup = undefined;
          cleanup();
        }
        this.cancelJob(job.id);
        reject(createAbortError());
      };

      if (signal) {
        signal.addEventListener('abort', abortHandler, { once: true });
        job.cleanup = () => signal.removeEventListener('abort', abortHandler);
      }

      this.queue.push(job);
      this.dispatch();
    });
  }

  private cancelJob(id: string) {
    const queueIndex = this.queue.findIndex(item => item.id === id);
    if (queueIndex >= 0) {
      const [job] = this.queue.splice(queueIndex, 1);
      job.cleanup?.();
      job.cleanup = undefined;
      this.dispatch();
      return;
    }

    const handle = this.workers.find(workerHandle => workerHandle.jobId === id);
    if (handle) {
      this.pending.delete(id);
      try {
        handle.worker.postMessage({ type: 'cancel', id } satisfies DiffWorkerRequestMessage);
      } catch (error) {
        // If postMessage fails (e.g. worker already closed) fall through to termination
      }
      this.replaceWorker(handle);
      this.dispatch();
    }
  }

  private dispatch() {
    if (this.queue.length === 0) return;
    for (const handle of this.workers) {
      if (this.queue.length === 0) break;
      if (handle.busy) continue;
      const job = this.queue.shift();
      if (!job) break;
      this.startJob(handle, job);
    }
  }

  private startJob(handle: WorkerHandle, job: Job) {
    handle.busy = true;
    handle.jobId = job.id;
    this.pending.set(job.id, job);
    try {
      handle.worker.postMessage({
        type: 'diff',
        id: job.id,
        mode: job.mode,
        payload: job.payload,
      } satisfies DiffWorkerRequestMessage);
    } catch (error) {
      this.pending.delete(job.id);
      handle.busy = false;
      handle.jobId = undefined;
      job.cleanup?.();
      job.reject(error);
      this.dispatch();
    }
  }
}

let singletonPool: DiffWorkerPool | null = null;

export const getDiffWorkerPool = (): DiffWorkerPool | null => {
  if (typeof window === 'undefined') return null;
  if (!singletonPool) {
    singletonPool = new DiffWorkerPool();
  }
  return singletonPool;
};
