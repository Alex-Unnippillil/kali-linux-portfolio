export type IdleTask = () => void | Promise<void>;

export interface IdleTaskManagerOptions {
  /**
   * Time in milliseconds of inactivity before the task runs.
   * Defaults to 45 seconds.
   */
  idleTimeout?: number;
  /**
   * Minimum time in milliseconds between task executions while idle.
   * Defaults to 15 minutes.
   */
  refreshInterval?: number;
  /**
   * Whether to start listening immediately. Defaults to true.
   */
  autoStart?: boolean;
}

export interface IdleTaskController {
  start(): void;
  stop(): void;
}

const DEFAULT_IDLE_TIMEOUT = 45_000;
const DEFAULT_REFRESH_INTERVAL = 15 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'pointerdown',
  'scroll',
  'focus',
  'visibilitychange',
];

class BrowserIdleTaskManager implements IdleTaskController {
  private readonly task: IdleTask;
  private readonly idleTimeout: number;
  private readonly refreshInterval: number;
  private idleTimer: number | null = null;
  private refreshTimer: number | null = null;
  private running = false;
  private started = false;

  constructor(task: IdleTask, options: IdleTaskManagerOptions = {}) {
    this.task = task;
    this.idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT;
    this.refreshInterval = options.refreshInterval ?? DEFAULT_REFRESH_INTERVAL;
    if (options.autoStart !== false) {
      this.start();
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.attachListeners();
    this.resetIdleTimer();
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.clearTimers();
    this.detachListeners();
  }

  private attachListeners(): void {
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  private detachListeners(): void {
    ACTIVITY_EVENTS.forEach((event) => {
      window.removeEventListener(event, this.handleActivity);
    });
  }

  private readonly handleActivity = (): void => {
    if (!this.started) return;
    this.clearTimers();
    this.resetIdleTimer();
  };

  private clearTimers(): void {
    if (this.idleTimer !== null) {
      window.clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private resetIdleTimer(): void {
    if (this.idleTimeout <= 0 || !this.started) return;
    this.idleTimer = window.setTimeout(() => {
      void this.onIdle();
    }, this.idleTimeout);
  }

  private scheduleRefresh(): void {
    if (this.refreshInterval <= 0 || !this.started) {
      this.resetIdleTimer();
      return;
    }
    this.refreshTimer = window.setTimeout(() => {
      void this.onIdle();
    }, this.refreshInterval);
  }

  private async onIdle(): Promise<void> {
    if (this.running || !this.started) return;
    this.clearTimers();
    this.running = true;
    try {
      await this.task();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Idle task manager failed to run task', error);
      }
    } finally {
      this.running = false;
      if (this.started) {
        this.scheduleRefresh();
      }
    }
  }
}

class NoopIdleTaskManager implements IdleTaskController {
  start(): void {}
  stop(): void {}
}

export function createIdleTaskManager(
  task: IdleTask,
  options?: IdleTaskManagerOptions,
): IdleTaskController {
  if (typeof window === 'undefined') {
    return new NoopIdleTaskManager();
  }
  return new BrowserIdleTaskManager(task, options);
}

export const idleTaskDefaults = {
  idleTimeout: DEFAULT_IDLE_TIMEOUT,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
};

export default createIdleTaskManager;
