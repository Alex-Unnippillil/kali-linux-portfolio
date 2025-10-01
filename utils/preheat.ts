/*
 * Scheduler utility to precompute background data structures without
 * impacting interactivity. Tasks are queued for the browser's idle
 * periods and budgets are tuned using device capabilities and recent
 * INP measurements. The exported default instance is shared across the
 * app so any feature can reuse the same heuristics.
 */

export interface PreheatConfig {
  baseBudget?: number;
  minBudget?: number;
  maxBudget?: number;
  cooldown?: number;
  autoListen?: boolean;
  autoObserveINP?: boolean;
}

export type PreheatPriority = 'low' | 'normal' | 'high';

export interface ScheduleOptions {
  id?: string;
  priority?: PreheatPriority;
  budget?: number;
}

interface IdleDeadline {
  didTimeout: boolean;
  timeRemaining: () => number;
}

type IdleCallback = (deadline: IdleDeadline) => void;

type IdleHandle = number;

type PreheatTask = () => void;

interface TaskEntry {
  id: string;
  fn: PreheatTask;
  priority: number;
  budget?: number;
}

interface SchedulerStats {
  tasksRun: number;
  canceled: number;
  pending: number;
  lastINP: number;
}

export interface PreheatScheduler {
  schedule(task: PreheatTask, options?: ScheduleOptions): () => void;
  cancel(id: string): void;
  cancelAll(): void;
  notifyInteraction(source?: string): void;
  getBudget(): number;
  getStats(): SchedulerStats;
}

const PRIORITY_ORDER: Record<PreheatPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
};

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

let schedulerIdCounter = 0;

export function createPreheater(config: PreheatConfig = {}): PreheatScheduler {
  const isBrowser = typeof window !== 'undefined';
  const queue: TaskEntry[] = [];
  const stats: SchedulerStats = {
    tasksRun: 0,
    canceled: 0,
    pending: 0,
    lastINP: 0,
  };

  const {
    baseBudget = 12,
    minBudget = 4,
    maxBudget = 32,
    cooldown = 500,
    autoListen = true,
    autoObserveINP = true,
  } = config;

  const fallbackTimeRemaining = (start: number, budget: number) => () => Math.max(0, budget - (now() - start));

  const scheduleIdle: (cb: IdleCallback) => IdleHandle = isBrowser && typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback.bind(window)
    : (cb: IdleCallback) => {
        const budget = maxBudget;
        const start = now();
        return window.setTimeout(() => cb({ didTimeout: false, timeRemaining: fallbackTimeRemaining(start, budget) }), 16);
      };

  const cancelIdle: (handle: IdleHandle) => void = isBrowser && typeof window.cancelIdleCallback === 'function'
    ? window.cancelIdleCallback.bind(window)
    : (handle: IdleHandle) => {
        window.clearTimeout(handle);
      };

  let idleHandle: IdleHandle | null = null;
  let resumeHandle: ReturnType<typeof setTimeout> | null = null;
  let interactionActive = false;
  let inpModifier = 1;
  const inpDurations: number[] = [];

  const deviceMultiplier = (() => {
    if (!isBrowser) return 1;
    const cores = typeof navigator !== 'undefined' && (navigator as any)?.hardwareConcurrency;
    if (!cores || Number.isNaN(cores)) return 1;
    if (cores >= 12) return 1.6;
    if (cores >= 8) return 1.35;
    if (cores >= 4) return 1.1;
    return 0.9;
  })();

  const updateInpModifier = () => {
    if (!inpDurations.length) {
      inpModifier = 1;
      return;
    }
    const sorted = [...inpDurations].sort((a, b) => a - b);
    const idx = Math.max(0, Math.floor(sorted.length * 0.9) - 1);
    const p90 = sorted[idx] ?? sorted[sorted.length - 1];
    if (p90 > 280) {
      inpModifier = 0.4;
    } else if (p90 > 220) {
      inpModifier = 0.6;
    } else if (p90 < 140 && deviceMultiplier > 1) {
      inpModifier = 1.2;
    } else {
      inpModifier = 1;
    }
  };

  if (isBrowser && autoObserveINP && typeof PerformanceObserver !== 'undefined') {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceEntry[]) {
          const duration = (entry as any).duration as number;
          if (!duration || !Number.isFinite(duration)) continue;
          stats.lastINP = Math.max(stats.lastINP, duration);
          inpDurations.push(duration);
          if (inpDurations.length > 30) inpDurations.shift();
          updateInpModifier();
        }
      });
      observer.observe({ type: 'event', buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
    } catch {
      /* ignore observer errors in unsupported browsers */
    }
  }

  const computeBudget = () => {
    const base = baseBudget * deviceMultiplier * inpModifier;
    return clamp(base, minBudget, maxBudget);
  };

  const requestFlush = () => {
    if (!isBrowser) {
      while (queue.length) {
        const task = queue.shift();
        if (!task) break;
        try {
          task.fn();
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[preheat] task error', error);
          }
        }
        stats.tasksRun += 1;
      }
      stats.pending = queue.length;
      return;
    }
    if (interactionActive || idleHandle !== null || !queue.length) {
      return;
    }
    idleHandle = scheduleIdle((deadline) => {
      idleHandle = null;
      flushQueue(deadline);
    });
  };

  const flushQueue = (deadline?: IdleDeadline) => {
    if (!queue.length || interactionActive) {
      stats.pending = queue.length;
      return;
    }
    const budgetCap = computeBudget();
    const deadlineObj = deadline ?? {
      didTimeout: false,
      timeRemaining: () => budgetCap,
    };
    let remaining = Math.min(deadlineObj.timeRemaining(), budgetCap);
    while (queue.length && remaining > 1 && !interactionActive) {
      const task = queue.shift();
      if (!task) break;
      const allowed = task.budget ? Math.min(remaining, task.budget) : remaining;
      if (allowed <= 0) {
        queue.unshift(task);
        break;
      }
      const start = now();
      try {
        task.fn();
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[preheat] task error', error);
        }
      }
      stats.tasksRun += 1;
      const elapsed = now() - start;
      remaining -= elapsed;
    }
    stats.pending = queue.length;
    if (queue.length && !interactionActive) {
      requestFlush();
    }
  };

  const cancel = (id: string) => {
    const index = queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      queue.splice(index, 1);
      stats.canceled += 1;
      stats.pending = queue.length;
    }
  };

  const cancelAll = () => {
    queue.splice(0, queue.length);
    stats.pending = 0;
    if (idleHandle !== null) {
      cancelIdle(idleHandle);
      idleHandle = null;
    }
  };

  const schedule = (task: PreheatTask, options: ScheduleOptions = {}) => {
    if (!isBrowser) {
      try {
        task();
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[preheat] task error', error);
        }
      }
      stats.tasksRun += 1;
      return () => undefined;
    }
    const id = options.id ?? `preheat-${schedulerIdCounter += 1}`;
    const priority = PRIORITY_ORDER[options.priority ?? 'normal'];
    const entry: TaskEntry = {
      id,
      fn: task,
      priority,
      budget: options.budget,
    };
    queue.push(entry);
    queue.sort((a, b) => a.priority - b.priority);
    stats.pending = queue.length;
    requestFlush();
    return () => cancel(id);
  };

  const notifyInteraction = () => {
    if (!isBrowser) return;
    interactionActive = true;
    if (idleHandle !== null) {
      cancelIdle(idleHandle);
      idleHandle = null;
    }
    if (resumeHandle !== null) {
      clearTimeout(resumeHandle);
    }
    resumeHandle = window.setTimeout(() => {
      interactionActive = false;
      resumeHandle = null;
      if (queue.length) {
        requestFlush();
      }
    }, cooldown);
  };

  if (isBrowser && autoListen) {
    const resumeFromVisibility = () => {
      if (document.visibilityState === 'visible') {
        interactionActive = false;
        if (queue.length) {
          requestFlush();
        }
      }
    };
    const interactionListener = () => notifyInteraction();
    window.addEventListener('pointerdown', interactionListener, { passive: true });
    window.addEventListener('keydown', interactionListener, { passive: true });
    window.addEventListener('touchstart', interactionListener, { passive: true });
    document.addEventListener('visibilitychange', resumeFromVisibility);
  }

  return {
    schedule,
    cancel,
    cancelAll,
    notifyInteraction,
    getBudget: computeBudget,
    getStats: () => ({ ...stats }),
  };
}

const defaultPreheater = createPreheater();

export default defaultPreheater;
