import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];

type IdleCallbackHandle = number;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

let initializationPromise: Promise<void> | null = null;
let analyticsInitialized = false;

const hasWindow = (): boolean => typeof window !== 'undefined';

const isTruthy = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().toLowerCase() === 'true';

export const isAnalyticsEnabled = (): boolean => {
  const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
  if (!trackingId) return false;

  const flag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS;
  if (flag === undefined) return true;

  return isTruthy(flag);
};

export const initializeAnalytics = async (): Promise<void> => {
  if (!hasWindow()) return;
  if (!isAnalyticsEnabled()) return;
  if (analyticsInitialized) return;

  if (!initializationPromise) {
    const trackingId = process.env.NEXT_PUBLIC_TRACKING_ID;
    initializationPromise = Promise.resolve()
      .then(() => {
        if (!trackingId) return;
        ReactGA.initialize(trackingId);
        analyticsInitialized = true;
      })
      .catch((error) => {
        initializationPromise = null;
        if (typeof console !== 'undefined') {
          console.error('Analytics initialization failed', error);
        }
        throw error;
      });
  }

  await initializationPromise;
};

export const scheduleAnalyticsInitialization = (): (() => void) | undefined => {
  if (!hasWindow()) return undefined;
  if (!isAnalyticsEnabled()) return undefined;

  const idleWindow = window as IdleWindow;

  const run = (): void => {
    void initializeAnalytics().catch(() => {
      // Error already logged inside initializeAnalytics.
    });
  };

  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(() => run());
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const timeoutHandle = window.setTimeout(run, 0);
  return () => window.clearTimeout(timeoutHandle);
};

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
  if (!isAnalyticsEnabled()) return;

  if (!analyticsInitialized && hasWindow()) {
    void initializeAnalytics();
  }

  try {
    const eventFn = ReactGA.event;
    if (typeof eventFn === 'function') {
      eventFn(...args);
    }
  } catch {
    // Ignore analytics errors
  }
};

export const logEvent = (event: EventInput): void => {
  safeEvent(event);
};

export const logGameStart = (game: string): void => {
  logEvent({ category: game, action: 'start' });
};

export const logGameEnd = (game: string, label?: string): void => {
  logEvent({ category: game, action: 'end', label });
};

export const logGameError = (game: string, message?: string): void => {
  logEvent({ category: game, action: 'error', label: message });
};

export const __resetAnalyticsStateForTests = (): void => {
  analyticsInitialized = false;
  initializationPromise = null;
};
