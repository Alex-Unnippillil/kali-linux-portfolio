const CANCEL_ERROR_NAME = 'AbortError';

export const TASK_CANCELLED = Symbol('worker-task-cancelled');

export class TaskCancelledError extends Error {
  constructor(message = 'Task cancelled') {
    super(message);
    this.name = CANCEL_ERROR_NAME;
  }
}

const createCancelError = () => new TaskCancelledError();

export const isTaskCancelledError = (err: unknown): err is TaskCancelledError =>
  err instanceof Error && err.name === CANCEL_ERROR_NAME;

const getDefaultConcurrency = () => {
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) {
    const cores = navigator.hardwareConcurrency;
    if (Number.isFinite(cores) && cores > 0) {
      return Math.min(4, Math.max(1, Math.floor(cores / 2)));
    }
  }
  return 2;
};

type ResolveResult<TResult> = TResult | typeof TASK_CANCELLED | undefined;

type ResolveFn<TResult> = (data: unknown) => ResolveResult<TResult>;

type WorkerFactory = () => Worker;

export interface WorkerTaskOptions<TResult> {
  onMessage?: (data: unknown) => void;
  resolve?: ResolveFn<TResult>;
  transfer?: Transferable[];
  onCancel?: (worker: Worker) => void;
  fallback?: () => TResult | Promise<TResult>;
}

interface WorkerTask<TMessage, TResult> {
  message: TMessage;
  transfer?: Transferable[];
  onMessage?: (data: unknown) => void;
  resolveExtractor: ResolveFn<TResult>;
  onCancel?: (worker: Worker) => void;
  resolve: (value: TResult) => void;
  reject: (reason?: unknown) => void;
  cancelled: boolean;
}

export interface WorkerPoolTask<TResult> {
  promise: Promise<TResult>;
  cancel: () => void;
}

export interface WorkerPoolOptions<TMessage, TResult> {
  size?: number;
  createWorker: WorkerFactory;
}

export class WorkerPool<TMessage, TResult> {
  private readonly size: number;

  private readonly createWorker: WorkerFactory;

  private readonly queue: WorkerTask<TMessage, TResult>[] = [];

  private readonly idleWorkers: Worker[] = [];

  private readonly activeTasks = new Map<Worker, WorkerTask<TMessage, TResult>>();

  private readonly workers = new Set<Worker>();

  private readonly supported: boolean;

  constructor({ size, createWorker }: WorkerPoolOptions<TMessage, TResult>) {
    this.size = Math.max(1, size ?? getDefaultConcurrency());
    this.createWorker = createWorker;
    this.supported = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  runTask(message: TMessage, options: WorkerTaskOptions<TResult> = {}): WorkerPoolTask<TResult> {
    if (!this.supported) {
      const fallbackPromise = options.fallback
        ? Promise.resolve().then(options.fallback)
        : Promise.reject(new Error('Web Workers are not supported'));
      return {
        promise: fallbackPromise,
        cancel: () => {
          /* no-op */
        },
      };
    }

    const resolveExtractor: ResolveFn<TResult> =
      options.resolve ?? ((data) => data as TResult);

    let task: WorkerTask<TMessage, TResult>;

    const promise = new Promise<TResult>((resolve, reject) => {
      task = {
        message,
        transfer: options.transfer,
        onMessage: options.onMessage,
        resolveExtractor,
        onCancel: options.onCancel,
        resolve,
        reject,
        cancelled: false,
      };
      this.queue.push(task);
      this.processQueue();
    });

    return {
      promise,
      cancel: () => this.cancelTask(task!),
    };
  }

  destroy() {
    for (const worker of Array.from(this.workers)) {
      this.disposeWorker(worker);
    }
    this.queue.length = 0;
    this.activeTasks.clear();
    this.idleWorkers.length = 0;
    this.workers.clear();
  }

  private cancelTask(task: WorkerTask<TMessage, TResult>) {
    if (task.cancelled) return;
    task.cancelled = true;
    const queueIndex = this.queue.indexOf(task);
    if (queueIndex >= 0) {
      this.queue.splice(queueIndex, 1);
      task.reject(createCancelError());
      return;
    }
    for (const [worker, activeTask] of this.activeTasks.entries()) {
      if (activeTask !== task) continue;
      try {
        activeTask.onCancel?.(worker);
      } catch (err) {
        console.warn('Worker cancel handler failed', err);
      }
      this.activeTasks.delete(worker);
      task.reject(createCancelError());
      this.disposeWorker(worker);
      this.processQueue();
      break;
    }
  }

  private processQueue() {
    if (!this.queue.length) return;
    let worker = this.getIdleWorker();
    while (worker && this.queue.length) {
      const task = this.queue.shift();
      if (!task) break;
      if (task.cancelled) {
        task.reject(createCancelError());
        worker = this.getIdleWorker();
        continue;
      }
      this.activeTasks.set(worker, task);
      try {
        if (task.transfer && task.transfer.length > 0) {
          worker.postMessage(task.message, task.transfer);
        } else {
          worker.postMessage(task.message as any);
        }
      } catch (err) {
        this.activeTasks.delete(worker);
        task.reject(err);
        this.disposeWorker(worker);
        worker = this.getIdleWorker();
        continue;
      }
      worker = this.getIdleWorker();
    }
  }

  private getIdleWorker(): Worker | undefined {
    if (this.idleWorkers.length > 0) {
      return this.idleWorkers.pop();
    }
    if (!this.supported) return undefined;
    if (this.workers.size >= this.size) return undefined;
    try {
      const worker = this.createWorker();
      this.attachWorker(worker);
      this.workers.add(worker);
      return worker;
    } catch (err) {
      console.warn('Failed to create worker', err);
      return undefined;
    }
  }

  private attachWorker(worker: Worker) {
    worker.onmessage = (event: MessageEvent) => {
      this.handleMessage(worker, event);
    };
    worker.onerror = (error) => {
      this.handleError(worker, error);
    };
    worker.onmessageerror = (error) => {
      this.handleError(worker, error);
    };
  }

  private handleMessage(worker: Worker, event: MessageEvent) {
    const task = this.activeTasks.get(worker);
    if (!task) return;

    try {
      task.onMessage?.(event.data);
    } catch (err) {
      console.warn('Worker message handler error', err);
    }

    let result: ResolveResult<TResult>;
    try {
      result = task.resolveExtractor(event.data);
    } catch (err) {
      this.activeTasks.delete(worker);
      task.reject(err);
      this.disposeWorker(worker);
      this.processQueue();
      return;
    }

    if (result === undefined) {
      return;
    }

    this.activeTasks.delete(worker);
    if (result === TASK_CANCELLED) {
      task.reject(createCancelError());
    } else {
      task.resolve(result);
    }
    this.releaseWorker(worker);
  }

  private handleError(worker: Worker, error: unknown) {
    const task = this.activeTasks.get(worker);
    if (task) {
      this.activeTasks.delete(worker);
      task.reject(error);
    }
    this.disposeWorker(worker);
    this.processQueue();
  }

  private releaseWorker(worker: Worker) {
    if (!this.workers.has(worker)) return;
    this.idleWorkers.push(worker);
    this.processQueue();
  }

  private disposeWorker(worker: Worker) {
    worker.onmessage = null;
    worker.onerror = null;
    worker.onmessageerror = null;
    try {
      worker.terminate();
    } catch (err) {
      console.warn('Failed to terminate worker', err);
    }
    const idleIndex = this.idleWorkers.indexOf(worker);
    if (idleIndex >= 0) {
      this.idleWorkers.splice(idleIndex, 1);
    }
    this.workers.delete(worker);
  }
}

