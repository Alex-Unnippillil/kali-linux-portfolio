type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

declare global {
  interface Window {
    requestIdleCallback?: (
      callback: (deadline: IdleDeadlineLike) => void,
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  }
}

type IdleCallback = (deadline: IdleDeadlineLike) => void;

const globalScope: typeof globalThis = typeof globalThis !== 'undefined'
  ? globalThis
  : ({} as typeof globalThis);

const fallbackDeadline: IdleDeadlineLike = {
  didTimeout: false,
  timeRemaining: () => 0,
};

const requestIdle = (callback: IdleCallback): number => {
  const request = (globalScope as any).requestIdleCallback as
    | undefined
    | ((cb: IdleCallback) => number);
  if (typeof request === 'function') {
    return request.call(globalScope, callback);
  }
  return globalScope.setTimeout
    ? globalScope.setTimeout(() => callback(fallbackDeadline), 50)
    : (setTimeout(() => callback(fallbackDeadline), 50) as unknown as number);
};

const cancelIdle = (handle: number | null) => {
  if (handle === null) return;
  const cancel = (globalScope as any).cancelIdleCallback as
    | undefined
    | ((h: number) => void);
  if (typeof cancel === 'function') {
    cancel.call(globalScope, handle);
    return;
  }
  if (globalScope.clearTimeout) {
    globalScope.clearTimeout(handle);
  } else {
    clearTimeout(handle);
  }
};

export interface IdleIndexerOptions<T, R> {
  process: (item: T, index: number) => R;
  getKey: (item: T, index: number) => string;
  onUpdate?: (snapshot: Map<string, R>, done: boolean) => void;
  chunkSize?: number;
  resumeDelay?: number;
}

const DEFAULT_CHUNK_SIZE = 25;
const DEFAULT_RESUME_DELAY = 200;

export class IdleIndexer<T, R> {
  private items: T[] = [];

  private cursor = 0;

  private idleHandle: number | null = null;

  private resumeHandle: ReturnType<typeof setTimeout> | null = null;

  private running = false;

  private index = new Map<string, R>();

  constructor(private readonly options: IdleIndexerOptions<T, R>) {}

  schedule(items: T[]): void {
    this.cancelAll();
    this.items = items;
    this.cursor = 0;
    this.index = new Map();
    this.emit(false);
    if (this.items.length === 0) {
      this.emit(true);
      return;
    }
    this.scheduleNext();
  }

  interrupt(): void {
    if (!this.running) return;
    cancelIdle(this.idleHandle);
    this.idleHandle = null;
    if (this.resumeHandle) {
      clearTimeout(this.resumeHandle);
    }
    this.running = this.cursor < this.items.length;
    if (!this.running) return;
    const delay = this.options.resumeDelay ?? DEFAULT_RESUME_DELAY;
    this.resumeHandle = setTimeout(() => {
      this.resumeHandle = null;
      this.scheduleNext();
    }, delay);
  }

  dispose(): void {
    this.cancelAll();
    this.items = [];
    this.index.clear();
  }

  private cancelAll() {
    cancelIdle(this.idleHandle);
    this.idleHandle = null;
    if (this.resumeHandle) {
      clearTimeout(this.resumeHandle);
      this.resumeHandle = null;
    }
    this.running = false;
  }

  private scheduleNext() {
    if (this.cursor >= this.items.length) {
      this.running = false;
      return;
    }
    this.running = true;
    this.idleHandle = requestIdle((deadline) => this.runChunk(deadline));
  }

  private runChunk(deadline: IdleDeadlineLike) {
    this.idleHandle = null;
    const limit = this.options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    let processed = 0;
    while (this.cursor < this.items.length) {
      const item = this.items[this.cursor];
      const key = this.options.getKey(item, this.cursor);
      const value = this.options.process(item, this.cursor);
      this.index.set(key, value);
      this.cursor += 1;
      processed += 1;
      if (processed >= limit) break;
      if (deadline.timeRemaining && deadline.timeRemaining() <= 1) break;
    }
    const done = this.cursor >= this.items.length;
    this.running = !done;
    this.emit(done);
    if (!done) {
      this.scheduleNext();
    }
  }

  private emit(done: boolean) {
    if (!this.options.onUpdate) return;
    this.options.onUpdate(new Map(this.index), done);
  }
}

export default IdleIndexer;
