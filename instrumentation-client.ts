const FIRST_PAINT_KEY = '__fp' as const;
const NAVIGATION_METRICS_KEY = '__navTransitions' as const;

type NavigationType = 'push' | 'replace' | 'traverse';

type NavigationMetric = {
  url: string;
  navigationType: NavigationType;
  timestamp: number;
};

type ClientInstrumentationHooks = {
  onRouterTransitionStart?: (url: string, navigationType: NavigationType) => void;
};

declare global {
  interface Window {
    __fp?: number;
    __navTransitions?: NavigationMetric[];
  }
}

const isBrowser = typeof window !== 'undefined';

const getPerformanceNow = (): number | undefined => {
  if (!isBrowser) return undefined;
  if (typeof window.performance?.now === 'function') {
    return window.performance.now();
  }
  if (typeof Date.now === 'function') {
    return Date.now();
  }
  return undefined;
};

const markFirstPaint = (): number | undefined => {
  if (!isBrowser) return undefined;

  const existing = window[FIRST_PAINT_KEY];
  if (typeof existing === 'number') {
    return existing;
  }

  const stamp = getPerformanceNow();
  if (typeof stamp === 'number') {
    window[FIRST_PAINT_KEY] = stamp;
  }
  return stamp;
};

const recordNavigation = (url: string, navigationType: NavigationType): void => {
  if (!isBrowser) return;

  const timestamp = getPerformanceNow();
  const entry: NavigationMetric = {
    url,
    navigationType,
    timestamp: typeof timestamp === 'number' ? timestamp : Number.NaN,
  };

  const buffer = Array.isArray(window[NAVIGATION_METRICS_KEY])
    ? window[NAVIGATION_METRICS_KEY]!
    : [];

  buffer.push(entry);
  window[NAVIGATION_METRICS_KEY] = buffer;
};

export function register(): ClientInstrumentationHooks {
  markFirstPaint();

  if (isBrowser && !Array.isArray(window[NAVIGATION_METRICS_KEY])) {
    window[NAVIGATION_METRICS_KEY] = [];
  }

  return {
    onRouterTransitionStart: (url, navigationType) => {
      recordNavigation(url, navigationType);
    },
  } satisfies ClientInstrumentationHooks;
}

const hooks = register();

const instrumentationHooks = {
  ...hooks,
  register,
};

export default instrumentationHooks;
export const onRouterTransitionStart = hooks.onRouterTransitionStart;
