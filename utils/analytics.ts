import ReactGA from 'react-ga4';

type EventInput = Parameters<typeof ReactGA.event>[0];

const safeEvent = (...args: Parameters<typeof ReactGA.event>): void => {
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

const envAnalyticsEnabled =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
const canEmitStudyMetrics = envAnalyticsEnabled || isTestEnv;

const getTimestamp = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

let clickDepth = 0;
let sessionStart: number | null = null;
let lastInteraction: number | null = null;
let listenersAttached = false;

const startSession = () => {
  if (sessionStart === null) {
    sessionStart = getTimestamp();
    lastInteraction = sessionStart;
  }
};

const sendStudyEvent = (action: string, data: { clickDepth: number; dwellMs: number }) => {
  if (!canEmitStudyMetrics) return;
  const event: EventInput = {
    category: 'study',
    action,
    label: JSON.stringify(data),
    nonInteraction: true,
  } as EventInput;
  if (action === 'session_summary') {
    (event as Record<string, unknown>).value = data.clickDepth;
  }
  safeEvent(event);
};

export const recordStudyClick = (): void => {
  if (!canEmitStudyMetrics) return;
  startSession();
  clickDepth += 1;
  lastInteraction = getTimestamp();
  const dwell = Math.round((lastInteraction ?? sessionStart!) - (sessionStart ?? 0));
  sendStudyEvent('click', { clickDepth, dwellMs: dwell });
};

export const flushStudyMetrics = (): void => {
  if (!canEmitStudyMetrics) {
    clickDepth = 0;
    sessionStart = null;
    lastInteraction = null;
    return;
  }
  if (sessionStart === null || clickDepth === 0) {
    clickDepth = 0;
    sessionStart = null;
    lastInteraction = null;
    return;
  }
  const now = lastInteraction ?? getTimestamp();
  const dwell = Math.round(now - sessionStart);
  sendStudyEvent('session_summary', { clickDepth, dwellMs: dwell });
  clickDepth = 0;
  sessionStart = null;
  lastInteraction = null;
};

const handleVisibilityChange = () => {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'hidden') {
    flushStudyMetrics();
  }
};

const attachStudyListeners = () => {
  if (listenersAttached || !canEmitStudyMetrics) return;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  window.addEventListener('click', recordStudyClick, { capture: true });
  window.addEventListener('pagehide', flushStudyMetrics);
  window.addEventListener('beforeunload', flushStudyMetrics);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  listenersAttached = true;
};

if (envAnalyticsEnabled) {
  attachStudyListeners();
}

export const __STUDY_TEST_ONLY = {
  reset(): void {
    if (listenersAttached && typeof window !== 'undefined' && typeof document !== 'undefined') {
      window.removeEventListener('click', recordStudyClick, { capture: true } as EventListenerOptions);
      window.removeEventListener('pagehide', flushStudyMetrics);
      window.removeEventListener('beforeunload', flushStudyMetrics);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    clickDepth = 0;
    sessionStart = null;
    lastInteraction = null;
    listenersAttached = false;
  },
  getMetrics(): { clickDepth: number; sessionStart: number | null } {
    return { clickDepth, sessionStart };
  },
  attach: attachStudyListeners,
};
