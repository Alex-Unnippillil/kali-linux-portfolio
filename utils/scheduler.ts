/*
 * Cooperative scheduler for prioritised tasks. Uses microtasks for
 * user-facing work and requestIdleCallback for background work. Tasks can
 * cooperatively yield to keep interaction latency low.
 */

export enum TaskPriority {
  UserBlocking = 3,
  UserVisible = 2,
  Background = 1,
  Idle = 0,
}

export interface TaskControls {
  shouldYield(): boolean;
  yield(): Promise<void>;
}

export type TaskCallback = (controls: TaskControls) => void | Promise<void>;

export interface TaskOptions {
  signal?: AbortSignal;
  label?: string;
}

export interface ScheduledTaskHandle {
  id: number;
  priority: TaskPriority;
  cancel(): void;
}

interface InternalTask {
  id: number;
  priority: TaskPriority;
  callback: TaskCallback;
  label?: string;
  cancelled: boolean;
  started: boolean;
  abortCleanup?: () => void;
}

interface SchedulerIdleDeadline {
  didTimeout: boolean;
  timeRemaining(): number;
}

export interface SchedulerStats {
  pendingBackgroundTasks: number;
  runningBackgroundTasks: number;
  activeBackgroundTasks: number;
  lastTask?: {
    priority: TaskPriority;
    duration: number;
    label?: string;
  } | null;
}

const globalScope: any = typeof globalThis !== 'undefined' ? globalThis : {};

type IdleHandle = number | ReturnType<typeof setTimeout> | null;

const fallbackRequestIdle = (
  cb: (deadline: SchedulerIdleDeadline) => void,
): IdleHandle => {
  if (typeof globalScope.setTimeout === 'function') {
    const start = Date.now();
    return globalScope.setTimeout(() => {
      const end = Date.now();
      const deadline: SchedulerIdleDeadline = {
        didTimeout: false,
        timeRemaining: () => Math.max(0, 16 - (end - start)),
      };
      cb(deadline);
    }, 16);
  }
  cb({ didTimeout: true, timeRemaining: () => 0 });
  return null;
};

const fallbackCancelIdle = (handle: IdleHandle): void => {
  if (handle == null) return;
  if (typeof globalScope.clearTimeout === 'function') {
    globalScope.clearTimeout(handle as any);
  }
};

const scheduleIdleCallback = (
  cb: (deadline: SchedulerIdleDeadline) => void,
): IdleHandle => {
  if (typeof globalScope.requestIdleCallback === 'function') {
    return globalScope.requestIdleCallback.call(globalScope, cb);
  }
  return fallbackRequestIdle(cb);
};

const cancelIdleCallback = (handle: IdleHandle): void => {
  if (handle == null) return;
  if (typeof globalScope.cancelIdleCallback === 'function') {
    globalScope.cancelIdleCallback.call(globalScope, handle as number);
  } else {
    fallbackCancelIdle(handle);
  }
};

const queueMicrotaskImpl: (callback: () => void) => void =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (cb) => Promise.resolve().then(cb);

const queues: Record<TaskPriority, InternalTask[]> = {
  [TaskPriority.UserBlocking]: [],
  [TaskPriority.UserVisible]: [],
  [TaskPriority.Background]: [],
  [TaskPriority.Idle]: [],
};

let microtaskScheduled = false;
let idleScheduled = false;
let idleHandle: IdleHandle = null;
let nextId = 1;
let currentIdleDeadline: SchedulerIdleDeadline | null = null;
let pendingBackgroundTasks = 0;
let runningBackgroundTasks = 0;
let lastTask: SchedulerStats['lastTask'] = null;

const statsSubscribers = new Set<(stats: SchedulerStats) => void>();

const now = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

const MIN_IDLE_BUDGET = 4;
const RUN_SLICE = 8;

const priorityOrder: TaskPriority[] = [
  TaskPriority.UserBlocking,
  TaskPriority.UserVisible,
  TaskPriority.Background,
  TaskPriority.Idle,
];

function emitStats(): void {
  const stats = getSchedulerStats();
  statsSubscribers.forEach((listener) => {
    try {
      listener(stats);
    } catch (err) {
      if (typeof console !== 'undefined' && console.error) {
        console.error('scheduler stats listener failed', err);
      }
    }
  });
}

function ensureMicrotask(): void {
  if (microtaskScheduled) return;
  microtaskScheduled = true;
  queueMicrotaskImpl(() => {
    microtaskScheduled = false;
    flushQueues([TaskPriority.UserBlocking, TaskPriority.UserVisible]);
  });
}

function ensureIdleProcessing(): void {
  if (idleScheduled) return;
  if (
    queues[TaskPriority.Background].length === 0 &&
    queues[TaskPriority.Idle].length === 0
  ) {
    return;
  }
  idleScheduled = true;
  idleHandle = scheduleIdleCallback((deadline) => {
    idleScheduled = false;
    idleHandle = null;
    currentIdleDeadline = deadline;
    flushQueues([TaskPriority.Background, TaskPriority.Idle], deadline);
    currentIdleDeadline = null;
  });
}

function flushQueues(
  priorities: TaskPriority[],
  deadline?: SchedulerIdleDeadline,
): void {
  for (const priority of priorities) {
    const queue = queues[priority];
    while (queue.length > 0) {
      if (
        deadline &&
        priority <= TaskPriority.Background &&
        !deadline.didTimeout &&
        deadline.timeRemaining() <= MIN_IDLE_BUDGET
      ) {
        ensureIdleProcessing();
        return;
      }
      const task = queue.shift();
      if (!task || task.cancelled) {
        continue;
      }
      runTask(task);
    }
  }
  if (queues[TaskPriority.UserBlocking].length || queues[TaskPriority.UserVisible].length) {
    ensureMicrotask();
  }
  if (queues[TaskPriority.Background].length || queues[TaskPriority.Idle].length) {
    ensureIdleProcessing();
  }
}

function isBackgroundPriority(priority: TaskPriority): boolean {
  return priority <= TaskPriority.Background;
}

function createControls(
  task: InternalTask,
  startTime: number,
): TaskControls {
  return {
    shouldYield: () => {
      if (!isBackgroundPriority(task.priority)) {
        return false;
      }
      if (currentIdleDeadline && !currentIdleDeadline.didTimeout) {
        return currentIdleDeadline.timeRemaining() <= MIN_IDLE_BUDGET;
      }
      return now() - startTime >= RUN_SLICE;
    },
    yield: () => {
      if (!isBackgroundPriority(task.priority)) {
        return Promise.resolve();
      }
      ensureIdleProcessing();
      return new Promise<void>((resolve) => {
        const resume = () => resolve();
        scheduleIdleCallback(() => resume());
      });
    },
  };
}

function finalizeTask(task: InternalTask, start: number): void {
  const duration = Math.max(0, now() - start);
  if (isBackgroundPriority(task.priority)) {
    runningBackgroundTasks = Math.max(0, runningBackgroundTasks - 1);
  }
  lastTask = {
    priority: task.priority,
    duration,
    label: task.label,
  };
  emitStats();
}

function runTask(task: InternalTask): void {
  const start = now();
  task.started = true;
  if (isBackgroundPriority(task.priority)) {
    pendingBackgroundTasks = Math.max(0, pendingBackgroundTasks - 1);
    runningBackgroundTasks += 1;
    emitStats();
  }
  const controls = createControls(task, start);
  const finish = () => finalizeTask(task, start);
  try {
    const result = task.callback(controls);
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).then(finish, (err) => {
        if (typeof console !== 'undefined' && console.error) {
          console.error('scheduler task rejected', err);
        }
        finish();
      });
    } else {
      finish();
    }
  } catch (err) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('scheduler task crashed', err);
    }
    finish();
  }
}

function removeTaskFromQueue(task: InternalTask): void {
  const queue = queues[task.priority];
  const index = queue.indexOf(task);
  if (index >= 0) {
    queue.splice(index, 1);
  }
}

export function scheduleTask(
  callback: TaskCallback,
  priority: TaskPriority = TaskPriority.UserVisible,
  options: TaskOptions = {},
): ScheduledTaskHandle {
  const id = nextId++;
  const task: InternalTask = {
    id,
    priority,
    callback,
    label: options.label,
    cancelled: false,
    started: false,
  };

  const handle: ScheduledTaskHandle = {
    id,
    priority,
    cancel: () => {
      if (task.cancelled) return;
      task.cancelled = true;
      if (task.abortCleanup) {
        task.abortCleanup();
        task.abortCleanup = undefined;
      }
      if (!task.started) {
        removeTaskFromQueue(task);
        if (isBackgroundPriority(task.priority)) {
          pendingBackgroundTasks = Math.max(0, pendingBackgroundTasks - 1);
          emitStats();
        }
      }
    },
  };

  if (options.signal) {
    if (options.signal.aborted) {
      handle.cancel();
      return handle;
    }
    const abortListener = () => handle.cancel();
    options.signal.addEventListener('abort', abortListener, { once: true });
    task.abortCleanup = () => {
      options.signal?.removeEventListener('abort', abortListener);
    };
  }

  queues[priority].push(task);
  if (isBackgroundPriority(priority)) {
    pendingBackgroundTasks += 1;
    emitStats();
  } else {
    ensureMicrotask();
  }

  if (priority >= TaskPriority.UserVisible) {
    ensureMicrotask();
  } else {
    ensureIdleProcessing();
  }

  return handle;
}

export function yieldToMain(
  priority: TaskPriority = TaskPriority.Background,
): Promise<void> {
  return new Promise((resolve) => {
    if (priority >= TaskPriority.UserVisible) {
      queueMicrotaskImpl(resolve);
    } else {
      scheduleIdleCallback(() => resolve());
    }
  });
}

export function getSchedulerStats(): SchedulerStats {
  return {
    pendingBackgroundTasks,
    runningBackgroundTasks,
    activeBackgroundTasks: pendingBackgroundTasks + runningBackgroundTasks,
    lastTask,
  };
}

export function onSchedulerStats(
  listener: (stats: SchedulerStats) => void,
): () => void {
  statsSubscribers.add(listener);
  listener(getSchedulerStats());
  return () => {
    statsSubscribers.delete(listener);
  };
}

export function __resetSchedulerForTests(): void {
  priorityOrder.forEach((priority) => {
    queues[priority].length = 0;
  });
  if (idleHandle !== null) {
    cancelIdleCallback(idleHandle);
    idleHandle = null;
  }
  microtaskScheduled = false;
  idleScheduled = false;
  currentIdleDeadline = null;
  pendingBackgroundTasks = 0;
  runningBackgroundTasks = 0;
  lastTask = null;
  statsSubscribers.clear();
  nextId = 1;
}

