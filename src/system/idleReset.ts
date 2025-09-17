export const IDLE_WARNING_TOAST_ID = 'idle-warning';
export const SYSTEM_TOAST_EVENT = 'system:toast';
export const SYSTEM_TOAST_DISMISS_EVENT = 'system:toast-dismiss';
export const SYSTEM_NOTIFICATION_EVENT = 'system:notification';

const DEFAULT_WARNING_MS = 4.5 * 60 * 1000; // 4 minutes 30 seconds
const DEFAULT_RESET_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_ACTIVITY_INTERVAL = 1000; // throttle activity resets to once per second

const RESET_MESSAGE = 'Session will reset in 30 seconds due to inactivity.';
const RESET_DONE_MESSAGE = 'Session reset after inactivity.';

export interface SystemToastDetail {
  id?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  duration?: number;
  level?: 'info' | 'warning' | 'error';
}

export interface SystemNotificationDetail {
  id: string;
  message: string;
  appId?: string;
  date?: number;
  level?: 'info' | 'warning' | 'error';
}

export interface IdleResetOptions {
  warningMs?: number;
  resetMs?: number;
  minActivityIntervalMs?: number;
  dispatchToast?: (detail: SystemToastDetail) => void;
  dismissToast?: (id?: string) => void;
  notify?: (detail: SystemNotificationDetail) => void;
  resetAction?: () => void;
  onWarning?: () => void;
  onReset?: () => void;
}

export interface IdleResetController {
  reset: () => void;
  stop: () => void;
}

type Listener = [EventTarget, string, EventListenerOrEventListenerObject, boolean | AddEventListenerOptions | undefined];

type MaybeWindow = Window & { idleResetController?: IdleResetController };

const defaultDispatchToast = (detail: SystemToastDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SystemToastDetail>(SYSTEM_TOAST_EVENT, { detail }));
};

const defaultDismissToast = (id?: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<{ id?: string }>(SYSTEM_TOAST_DISMISS_EVENT, { detail: { id } }));
};

const defaultNotify = (detail: SystemNotificationDetail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<SystemNotificationDetail>(SYSTEM_NOTIFICATION_EVENT, { detail }));
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(detail.message);
    } catch {
      // ignore notification errors
    }
  }
};

const defaultResetAction = () => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.clear();
  } catch {
    // ignore storage errors
  }
  // best-effort IndexedDB cleanup (idb-keyval stores settings here)
  try {
    if (typeof indexedDB !== 'undefined' && 'databases' in indexedDB) {
      void (indexedDB as any)
        .databases?.()
        ?.then((dbs: Array<{ name?: string }>) => {
          dbs
            ?.map((db) => db?.name)
            .filter((name): name is string => Boolean(name))
            .forEach((name) => {
              try {
                indexedDB.deleteDatabase(name);
              } catch {
                // ignore deletion errors
              }
            });
        })
        .catch(() => {});
    }
  } catch {
    // ignore idb errors
  }
  window.dispatchEvent(new Event('system:session-reset'));
  try {
    window.location.reload();
  } catch {
    // ignore reload errors
  }
};

const matchesDisplayMode = (win: Window, mode: string) => {
  if (typeof win.matchMedia !== 'function') return false;
  try {
    return win.matchMedia(`(display-mode: ${mode})`).matches;
  } catch {
    return false;
  }
};

const hashIndicatesKiosk = (hash: string) => hash.toLowerCase().includes('kiosk');

const queryIndicatesKiosk = (search: string) => {
  try {
    const params = new URLSearchParams(search);
    const kioskParam = params.get('kiosk') ?? params.get('mode');
    if (!kioskParam) return false;
    return kioskParam.toLowerCase() === '1' || kioskParam.toLowerCase() === 'true' || kioskParam.toLowerCase() === 'kiosk';
  } catch {
    return false;
  }
};

export function shouldEnableIdleReset(win?: Window): boolean {
  const w = win ?? (typeof window !== 'undefined' ? window : undefined);
  if (!w) return false;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_KIOSK_MODE === 'true') {
    return true;
  }
  const { search = '', hash = '' } = w.location || {};
  if (queryIndicatesKiosk(search) || hashIndicatesKiosk(hash ?? '')) {
    return true;
  }
  return matchesDisplayMode(w, 'kiosk') || matchesDisplayMode(w, 'fullscreen');
}

export function initIdleReset(options: IdleResetOptions = {}): IdleResetController {
  if (typeof window === 'undefined') {
    return {
      reset: () => {},
      stop: () => {},
    };
  }

  const warningMs = options.warningMs ?? DEFAULT_WARNING_MS;
  const resetMs = options.resetMs ?? DEFAULT_RESET_MS;
  const minInterval = options.minActivityIntervalMs ?? DEFAULT_ACTIVITY_INTERVAL;

  if (warningMs >= resetMs) {
    throw new Error('warningMs must be less than resetMs');
  }

  const dispatchToast = options.dispatchToast ?? defaultDispatchToast;
  const dismissToast = options.dismissToast ?? defaultDismissToast;
  const notify = options.notify ?? defaultNotify;
  const resetAction = options.resetAction ?? defaultResetAction;

  let warned = false;
  let stopped = false;
  let lastActivity = Date.now();
  let warningTimeout: ReturnType<typeof window.setTimeout> | null = null;
  let resetTimeout: ReturnType<typeof window.setTimeout> | null = null;
  const listeners: Listener[] = [];

  const clearTimers = () => {
    if (warningTimeout !== null) {
      window.clearTimeout(warningTimeout);
      warningTimeout = null;
    }
    if (resetTimeout !== null) {
      window.clearTimeout(resetTimeout);
      resetTimeout = null;
    }
  };

  const executeReset = () => {
    if (stopped) return;
    warned = false;
    clearTimers();
    dismissToast(IDLE_WARNING_TOAST_ID);
    options.onReset?.();
    notify({
      id: `idle-reset-${Date.now()}`,
      message: RESET_DONE_MESSAGE,
      appId: 'system',
      date: Date.now(),
      level: 'info',
    });
    try {
      resetAction();
    } catch {
      // ignore reset errors
    }
  };

  const showWarning = () => {
    if (stopped) return;
    warned = true;
    const duration = Math.max(resetMs - warningMs, 1000);
    const handleAction = () => handleActivity(true);
    const handleClose = () => {
      warned = false;
    };
    dispatchToast({
      id: IDLE_WARNING_TOAST_ID,
      message: RESET_MESSAGE,
      actionLabel: 'Stay Active',
      onAction: handleAction,
      onClose: handleClose,
      duration,
      level: 'warning',
    });
    notify({
      id: `idle-warning-${Date.now()}`,
      message: RESET_MESSAGE,
      appId: 'system',
      date: Date.now(),
      level: 'warning',
    });
    options.onWarning?.();
  };

  const scheduleTimers = () => {
    clearTimers();
    warningTimeout = window.setTimeout(showWarning, warningMs);
    resetTimeout = window.setTimeout(executeReset, resetMs);
  };

  const handleActivity = (force = false) => {
    if (stopped) return;
    const now = Date.now();
    if (!force && !warned && now - lastActivity < minInterval) {
      return;
    }
    lastActivity = now;
    if (warned) {
      warned = false;
      dismissToast(IDLE_WARNING_TOAST_ID);
    }
    scheduleTimers();
  };

  const handleVisibility = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible') {
      handleActivity(true);
    }
  };

  const register = (
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ) => {
    target.addEventListener(type, listener, options);
    listeners.push([target, type, listener, options]);
  };

  register(window, 'pointerdown', () => handleActivity(false), { passive: true });
  register(window, 'pointermove', () => handleActivity(false), { passive: true });
  register(window, 'mousedown', () => handleActivity(false));
  register(window, 'touchstart', () => handleActivity(false), { passive: true });
  register(window, 'keydown', () => handleActivity(true));
  register(window, 'wheel', () => handleActivity(false), { passive: true });
  register(window, 'scroll', () => handleActivity(false), { passive: true });
  register(window, 'focus', () => handleActivity(true));
  if (typeof document !== 'undefined') {
    register(document, 'visibilitychange', handleVisibility);
  }

  scheduleTimers();

  const controller: IdleResetController = {
    reset: () => handleActivity(true),
    stop: () => {
      if (stopped) return;
      stopped = true;
      clearTimers();
      if (warned) {
        dismissToast(IDLE_WARNING_TOAST_ID);
      }
      listeners.forEach(([target, type, listener, opts]) => {
        target.removeEventListener(type, listener, opts);
      });
      listeners.length = 0;
      if ((window as MaybeWindow).idleResetController === controller) {
        delete (window as MaybeWindow).idleResetController;
      }
    },
  };

  const win = window as MaybeWindow;
  if (win.idleResetController) {
    win.idleResetController.stop();
  }
  win.idleResetController = controller;

  return controller;
}

export default initIdleReset;
