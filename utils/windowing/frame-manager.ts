const RAF_MANAGER_KEY = '__desktopRafManager__';

type FrameCallback = (timestamp: number) => void;

type ActiveFrame = {
  windowId: string;
  callback: FrameCallback;
};

class FrameManager {
  private readonly win: Window & Record<string, unknown>;
  private scopeStack: string[] = [];
  private frozen = new Set<string>();
  private frames = new Map<number, ActiveFrame>();
  private queues = new Map<string, Map<number, FrameCallback>>();
  private nativeRequest: typeof requestAnimationFrame;
  private nativeCancel: typeof cancelAnimationFrame;
  private readonly defaultRequest: typeof requestAnimationFrame;
  private readonly defaultCancel: typeof cancelAnimationFrame;
  private readonly requestOverride: typeof requestAnimationFrame;
  private readonly cancelOverride: typeof cancelAnimationFrame;
  private syntheticId = -1;

  constructor(win: Window & Record<string, unknown>) {
    this.win = win;
    const defaultRequest =
      typeof win.requestAnimationFrame === 'function'
        ? win.requestAnimationFrame.bind(win)
        : ((cb: FrameCallback) => win.setTimeout(() => cb(Date.now()), 16)) as unknown as typeof requestAnimationFrame;
    const defaultCancel =
      typeof win.cancelAnimationFrame === 'function'
        ? win.cancelAnimationFrame.bind(win)
        : (win.clearTimeout.bind(win) as unknown as typeof cancelAnimationFrame);

    this.defaultRequest = defaultRequest;
    this.defaultCancel = defaultCancel;
    this.nativeRequest = defaultRequest;
    this.nativeCancel = defaultCancel;

    this.requestOverride = (callback: FrameCallback): number => {
      const windowId = this.scopeStack[this.scopeStack.length - 1] ?? null;
      return this.schedule(windowId, callback);
    };

    this.cancelOverride = ((handle: number) => {
      this.cancel(handle);
    }) as typeof cancelAnimationFrame;

    this.attachOverrides();
  }

  ensureOverrides() {
    const requestDescriptor = Object.getOwnPropertyDescriptor(this.win, 'requestAnimationFrame');
    const cancelDescriptor = Object.getOwnPropertyDescriptor(this.win, 'cancelAnimationFrame');
    if (requestDescriptor?.get !== this.requestOverride || cancelDescriptor?.get !== this.cancelOverride) {
      this.attachOverrides();
    }
  }

  private attachOverrides() {
    Object.defineProperty(this.win, 'requestAnimationFrame', {
      configurable: true,
      enumerable: true,
      get: () => this.requestOverride,
      set: (fn: typeof requestAnimationFrame | null | undefined) => {
        if (typeof fn === 'function') {
          if (fn === this.requestOverride) {
            return;
          }
          this.nativeRequest = fn.bind(this.win);
        } else {
          this.nativeRequest = this.defaultRequest;
        }
      },
    });

    Object.defineProperty(this.win, 'cancelAnimationFrame', {
      configurable: true,
      enumerable: true,
      get: () => this.cancelOverride,
      set: (fn: typeof cancelAnimationFrame | null | undefined) => {
        if (typeof fn === 'function') {
          if (fn === this.cancelOverride) {
            return;
          }
          this.nativeCancel = fn.bind(this.win);
        } else {
          this.nativeCancel = this.defaultCancel;
        }
      },
    });
  }

  runWithScope<T>(windowId: string, fn: () => T): T {
    this.scopeStack.push(windowId);
    try {
      return fn();
    } finally {
      this.scopeStack.pop();
    }
  }

  schedule(windowId: string | null, callback: FrameCallback): number {
    if (!windowId) {
      return this.nativeRequest(callback);
    }

    if (this.frozen.has(windowId)) {
      return this.enqueue(windowId, callback);
    }

    const manager = this;
    let handle = 0;
    const wrapped: FrameCallback = (timestamp) => {
      manager.frames.delete(handle);
      if (manager.frozen.has(windowId)) {
        manager.enqueue(windowId, callback);
        return;
      }
      manager.scopeStack.push(windowId);
      try {
        callback(timestamp);
      } finally {
        manager.scopeStack.pop();
      }
    };

    handle = this.nativeRequest(wrapped);
    this.frames.set(handle, { windowId, callback });
    return handle;
  }

  cancel(handle: number) {
    if (this.frames.has(handle)) {
      this.frames.delete(handle);
      this.nativeCancel(handle);
      return;
    }

    for (const queue of this.queues.values()) {
      if (queue.delete(handle)) {
        return;
      }
    }

    this.nativeCancel(handle);
  }

  freeze(windowId: string) {
    if (this.frozen.has(windowId)) return;

    this.frozen.add(windowId);
    const queue = this.queues.get(windowId) ?? new Map<number, FrameCallback>();

    for (const [handle, meta] of Array.from(this.frames.entries())) {
      if (meta.windowId === windowId) {
        this.nativeCancel(handle);
        this.frames.delete(handle);
        queue.set(handle, meta.callback);
      }
    }

    if (queue.size > 0) {
      this.queues.set(windowId, queue);
    }
  }

  resume(windowId: string) {
    if (!this.frozen.has(windowId)) return;

    this.frozen.delete(windowId);
    const queue = this.queues.get(windowId);
    if (!queue) return;

    this.queues.delete(windowId);
    queue.forEach((callback) => {
      this.schedule(windowId, callback);
    });
  }

  private enqueue(windowId: string, callback: FrameCallback): number {
    const id = this.syntheticId--;
    let queue = this.queues.get(windowId);
    if (!queue) {
      queue = new Map();
      this.queues.set(windowId, queue);
    }
    queue.set(id, callback);
    return id;
  }
}

type FrameManagerWindow = Window & {
  [RAF_MANAGER_KEY]?: FrameManager;
};

const getWindow = (): FrameManagerWindow | null => {
  if (typeof window === 'undefined') return null;
  return window as FrameManagerWindow;
};

const getManager = (): FrameManager | null => {
  const win = getWindow();
  if (!win) return null;
  if (!win[RAF_MANAGER_KEY]) {
    win[RAF_MANAGER_KEY] = new FrameManager(win);
  } else {
    win[RAF_MANAGER_KEY]?.ensureOverrides();
  }
  return win[RAF_MANAGER_KEY] ?? null;
};

export const runWithWindowScope = <T>(windowId: string, fn: () => T): T => {
  const manager = getManager();
  if (!manager) return fn();
  return manager.runWithScope(windowId, fn);
};

export const freezeWindowFrames = (windowId: string) => {
  const manager = getManager();
  if (!manager) return;
  manager.freeze(windowId);
};

export const resumeWindowFrames = (windowId: string) => {
  const manager = getManager();
  if (!manager) return;
  manager.resume(windowId);
};

