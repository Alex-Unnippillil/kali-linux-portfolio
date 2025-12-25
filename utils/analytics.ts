type ReactGAType = typeof import('react-ga4');
type EventInput = Parameters<ReactGAType['event']>[0];
type SendInput = Parameters<ReactGAType['send']>[0];

declare const jest: undefined | Record<string, unknown>;

let cachedReactGA: ReactGAType | null = null;
let loadPromise: Promise<ReactGAType | null> | null = null;

const analyticsEnabled = (): boolean => {
  if (typeof jest !== 'undefined') return true;
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' || Boolean(process.env.NEXT_PUBLIC_TRACKING_ID);
};

const loadReactGA = async (): Promise<ReactGAType | null> => {
  if (!analyticsEnabled()) return null;
  if (cachedReactGA) return cachedReactGA;
  if (!loadPromise) {
    loadPromise = import('react-ga4')
      .then((mod) => {
        cachedReactGA = (mod as unknown as { default?: ReactGAType }).default ?? (mod as ReactGAType);
        return cachedReactGA;
      })
      .catch((err) => {
        console.warn('Failed to load analytics', err);
        return null;
      });
  }
  return loadPromise;
};

const withAnalytics = (fn: (ga: ReactGAType) => void): void => {
  void loadReactGA().then((ga) => {
    if (!ga) return;
    try {
      fn(ga);
    } catch (error) {
      console.warn('Analytics call failed', error);
    }
  });
};

export const sendPageView = (payload: SendInput): void => {
  withAnalytics((ga) => ga.send(payload));
};

export const trackEvent = (event: EventInput): void => {
  withAnalytics((ga) => ga.event(event));
};

export const logEvent = (event: EventInput): void => {
  trackEvent(event);
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

export const __resetAnalyticsForTests = (): void => {
  cachedReactGA = null;
  loadPromise = null;
};

export const __setAnalyticsInstanceForTests = (instance: ReactGAType | null): void => {
  cachedReactGA = instance;
  loadPromise = instance ? Promise.resolve(instance) : null;
};
