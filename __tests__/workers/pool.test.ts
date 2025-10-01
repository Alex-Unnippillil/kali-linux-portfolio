import { WorkerPool } from '../../workers/pool/WorkerPool';
import { WorkerMessageType } from '../../workers/pool/messages';

interface ListenerMap {
  message: Set<(event: MessageEvent<any>) => void>;
  error: Set<(event: ErrorEvent) => void>;
}

type ExecuteHandler = (
  message: { jobId: string; payload: any },
  respond: (data: any) => void,
) => void;

type CancelHandler = (jobId: string) => void;

class FakeWorker implements Worker {
  onmessage: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: Worker, ev: MessageEvent) => any) | null = null;
  onerror: ((this: AbstractWorker, ev: ErrorEvent) => any) | null = null;
  postMessage!: (message: any, transfer?: Transferable[]) => void;
  addEventListener!: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => void;
  removeEventListener!: (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) => void;
  dispatchEvent!: (event: Event) => boolean;

  private readonly listeners: ListenerMap = {
    message: new Set(),
    error: new Set(),
  };

  constructor(
    private readonly execute: ExecuteHandler,
    private readonly cancel?: CancelHandler,
  ) {
    this.postMessage = (message: any) => {
      if (message.type === WorkerMessageType.Execute) {
        this.execute(
          { jobId: message.jobId, payload: message.payload },
          (data) => this.emit('message', { data }),
        );
      } else if (message.type === WorkerMessageType.Cancel) {
        this.cancel?.(message.jobId);
      }
    };
    this.addEventListener = (type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (!listener) return;
      if (type === 'message') {
        this.listeners.message.add(listener as (event: MessageEvent<any>) => void);
      } else if (type === 'error') {
        this.listeners.error.add(listener as (event: ErrorEvent) => void);
      }
    };
    this.removeEventListener = (type: string, listener: EventListenerOrEventListenerObject | null) => {
      if (!listener) return;
      if (type === 'message') {
        this.listeners.message.delete(listener as (event: MessageEvent<any>) => void);
      } else if (type === 'error') {
        this.listeners.error.delete(listener as (event: ErrorEvent) => void);
      }
    };
    this.dispatchEvent = () => true;
  }

  terminate() {
    this.listeners.message.clear();
    this.listeners.error.clear();
  }

  private emit(type: 'message' | 'error', event: any) {
    if (type === 'message') {
      this.listeners.message.forEach((listener) => listener(event));
      this.onmessage?.call(this, event);
    } else {
      this.listeners.error.forEach((listener) => listener(event));
      this.onerror?.call(this, event);
    }
  }
}

describe('WorkerPool', () => {
  it('honours queue priority ordering', async () => {
    const pool = new WorkerPool();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    pool.registerWorker({
      name: 'priority',
      maxConcurrency: 1,
      create: () =>
        new FakeWorker((message, respond) => {
          const delay = message.payload.delay ?? 0;
          const timer = setTimeout(() => {
            respond({
              type: WorkerMessageType.Result,
              jobId: message.jobId,
              result: message.payload.value,
            });
          }, delay);
          timers.set(message.jobId, timer);
        }),
    });

    const first = pool.enqueue<{ delay: number; value: string }, string, unknown>({
      worker: 'priority',
      payload: { delay: 30, value: 'first' },
      priority: 0,
    });

    const second = pool.enqueue<{ delay: number; value: string }, string, unknown>({
      worker: 'priority',
      payload: { delay: 5, value: 'second' },
      priority: 1,
    });

    const third = pool.enqueue<{ delay: number; value: string }, string, unknown>({
      worker: 'priority',
      payload: { delay: 5, value: 'third' },
      priority: 5,
    });

    const completionOrder: string[] = [];
    first.promise.then((value) => completionOrder.push(value));
    second.promise.then((value) => completionOrder.push(value));
    third.promise.then((value) => completionOrder.push(value));

    await Promise.all([first.promise, second.promise, third.promise]);
    expect(completionOrder).toEqual(['first', 'third', 'second']);

    timers.forEach((timer) => clearTimeout(timer));
  });

  it('cancels in-flight jobs within 200ms', async () => {
    const pool = new WorkerPool();
    const timers = new Map<string, ReturnType<typeof setTimeout>>();

    pool.registerWorker({
      name: 'cancellable',
      maxConcurrency: 1,
      create: () =>
        new FakeWorker(
          (message, respond) => {
            const timer = setTimeout(() => {
              respond({
                type: WorkerMessageType.Result,
                jobId: message.jobId,
                result: 'done',
              });
            }, 500);
            timers.set(message.jobId, timer);
          },
          (jobId) => {
            const timer = timers.get(jobId);
            if (timer) {
              clearTimeout(timer);
              timers.delete(jobId);
            }
          },
        ),
    });

    const job = pool.enqueue<{ delay: number }, string, unknown>({
      worker: 'cancellable',
      payload: { delay: 500 },
    });

    const start = Date.now();
    pool.cancelJob(job.jobId);

    await expect(job.promise).rejects.toThrow('Job cancelled');
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('emits progress updates to listeners', async () => {
    const pool = new WorkerPool();

    pool.registerWorker({
      name: 'progress',
      maxConcurrency: 1,
      create: () =>
        new FakeWorker((message, respond) => {
          respond({
            type: WorkerMessageType.Progress,
            jobId: message.jobId,
            progress: 0.25,
          });
          setTimeout(() => {
            respond({
              type: WorkerMessageType.Progress,
              jobId: message.jobId,
              progress: 0.5,
            });
            respond({
              type: WorkerMessageType.Result,
              jobId: message.jobId,
              result: 'done',
            });
          }, 10);
        }),
    });

    const snapshots: number[] = [];
    pool.addListener((event, snapshot) => {
      if (event === 'job-progress') {
        snapshots.push(snapshot.progress as number);
      }
    });

    const job = pool.enqueue<null, string, number>({
      worker: 'progress',
      payload: null,
    });

    await job.promise;
    expect(snapshots).toEqual([0.25, 0.5]);
  });
});
