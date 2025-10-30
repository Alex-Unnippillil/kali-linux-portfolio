export type PrefetchTask = () => void | Promise<void>;

interface IdleDeadlineLike {
  didTimeout?: boolean;
  timeRemaining?: () => number;
}

interface IdleEnvironment {
  requestIdleCallback?: (
    callback: (deadline: IdleDeadlineLike) => void,
    options?: { timeout?: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout?: typeof setTimeout;
  clearTimeout?: typeof clearTimeout;
}

export interface PrefetchSchedule {
  handle: number | ReturnType<typeof setTimeout> | null;
  cancel: () => void;
}

export interface PrefetchOptions {
  env?: IdleEnvironment;
  limit?: number;
  timeout?: number;
}

const isPromiseLike = (value: unknown): value is Promise<unknown> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as Promise<unknown>).then === 'function'
  );

const runTasks = (tasks: PrefetchTask[]) => {
  tasks.forEach((task) => {
    try {
      const result = task();
      if (isPromiseLike(result)) {
        result.catch(() => {
          // ignore prefetch rejections
        });
      }
    } catch {
      // ignore synchronous failures to avoid surfacing in production
    }
  });
};

export const scheduleIdlePrefetch = (
  tasks: PrefetchTask[],
  options: PrefetchOptions = {}
): PrefetchSchedule | null => {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return null;
  }

  const { env, limit = 3, timeout = 0 } = options;
  const resolvedEnv: IdleEnvironment | undefined =
    env || (typeof window !== 'undefined' ? window : undefined);

  if (!resolvedEnv) {
    return null;
  }

  const filteredTasks = tasks
    .filter((task): task is PrefetchTask => typeof task === 'function')
    .slice(0, limit);

  if (filteredTasks.length === 0) {
    return null;
  }

  if (typeof resolvedEnv.requestIdleCallback === 'function') {
    const handle = resolvedEnv.requestIdleCallback(
      () => runTasks(filteredTasks),
      { timeout }
    );
    return {
      handle,
      cancel: () => {
        if (typeof resolvedEnv.cancelIdleCallback === 'function') {
          resolvedEnv.cancelIdleCallback(handle);
        }
      },
    };
  }

  if (typeof resolvedEnv.setTimeout === 'function') {
    const handle = resolvedEnv.setTimeout(() => runTasks(filteredTasks), timeout);
    return {
      handle,
      cancel: () => {
        if (typeof resolvedEnv.clearTimeout === 'function') {
          resolvedEnv.clearTimeout(handle);
        }
      },
    };
  }

  // As a final fallback, run tasks immediately without scheduling.
  runTasks(filteredTasks);
  return {
    handle: null,
    cancel: () => {},
  };
};

