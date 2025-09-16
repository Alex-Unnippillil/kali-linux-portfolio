import ReactGA from 'react-ga4';

type ReactGAEventArgs = Parameters<typeof ReactGA.event>;

type ReactGASendArgs = Parameters<typeof ReactGA.send>;

export const ANALYTICS_CONSENT_STORAGE_KEY = 'analytics-consent';

export const ANALYTICS_CONSENT = {
  GRANTED: 'granted',
  DENIED: 'denied',
} as const;

export type AnalyticsConsentValue =
  (typeof ANALYTICS_CONSENT)[keyof typeof ANALYTICS_CONSENT];

const getWindow = (): Window | null =>
  typeof window === 'undefined' ? null : window;

const getStorage = (): Storage | null => {
  const win = getWindow();
  if (!win) return null;
  try {
    return win.localStorage;
  } catch {
    return null;
  }
};

export const isAnalyticsEnvEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';

export const getAnalyticsConsent = (): AnalyticsConsentValue | null => {
  const storage = getStorage();
  if (!storage) return null;
  const value = storage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
  if (value === ANALYTICS_CONSENT.GRANTED || value === ANALYTICS_CONSENT.DENIED) {
    return value;
  }
  return null;
};

const getTrackingId = (): string | undefined =>
  process.env.NEXT_PUBLIC_TRACKING_ID;

const updateGaDisable = (enabled: boolean): void => {
  const win = getWindow();
  const trackingId = getTrackingId();
  if (!win || !trackingId) return;
  (win as typeof window & Record<string, boolean>)[`ga-disable-${trackingId}`] = !enabled;
};

export const setAnalyticsConsent = (value: AnalyticsConsentValue): void => {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, value);
  const allow = value === ANALYTICS_CONSENT.GRANTED && isAnalyticsEnvEnabled();
  updateGaDisable(allow);
  if (!allow) {
    initialized = false;
  }
};

export const shouldPromptForAnalyticsConsent = (): boolean => {
  if (!isAnalyticsEnvEnabled()) return false;
  if (!getWindow()) return false;
  return getAnalyticsConsent() === null;
};

export const isAnalyticsEnabled = (): boolean => {
  if (!isAnalyticsEnvEnabled()) return false;
  if (!getWindow()) return false;
  return getAnalyticsConsent() === ANALYTICS_CONSENT.GRANTED;
};

let initialized = false;

export const __resetAnalyticsStateForTests = (): void => {
  initialized = false;
};

export const initializeAnalytics = (): boolean => {
  if (!isAnalyticsEnabled()) {
    updateGaDisable(false);
    return false;
  }
  if (initialized) return true;
  const trackingId = getTrackingId();
  if (!trackingId) return false;
  try {
    updateGaDisable(true);
    ReactGA.initialize(trackingId);
    initialized = true;
    return true;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Analytics initialization failed', error);
    }
    return false;
  }
};

const safeEvent = (...args: ReactGAEventArgs): void => {
  try {
    ReactGA.event(...args);
  } catch {
    // ignore analytics errors
  }
};

const safeSend = (...args: ReactGASendArgs): void => {
  try {
    ReactGA.send(...args);
  } catch {
    // ignore analytics errors
  }
};

export const trackEvent = (...args: ReactGAEventArgs): void => {
  if (!isAnalyticsEnabled()) return;
  safeEvent(...args);
};

export const trackPageview = (
  page: string,
  title?: string,
): void => {
  if (!isAnalyticsEnabled()) return;
  safeSend({ hitType: 'pageview', page, title });
};

export const GA_CATEGORY = {
  CONTEXT_MENU: 'Context Menu',
  OPEN_APP: 'Open App',
  SCREEN_CHANGE: 'Screen Change',
  RESUME: 'resume',
  CONTACT: 'contact',
  FROGGER: 'Frogger',
  SOLITAIRE: 'Solitaire',
  CHECKERS: 'Checkers',
  BLACKJACK: 'Blackjack',
  WEB_VITALS: 'Web Vitals',
  PERFORMANCE_ALERT: 'Performance Alert',
} as const;

export const GA_ACTION = {
  CONTEXT_MENU: {
    DESKTOP_OPEN: 'Opened Desktop Context Menu',
    APP_OPEN: 'Opened App Context Menu',
    TASKBAR_OPEN: 'Opened Taskbar Context Menu',
    DEFAULT_OPEN: 'Opened Default Context Menu',
  },
  SCREEN_CHANGE: {
    LOCK: 'Set Screen to Locked',
    SHUTDOWN: 'Switched off the Ubuntu',
  },
  RESUME: {
    DOWNLOAD: 'download',
  },
  CONTACT: {
    SUBMIT_SUCCESS: 'submit_success',
  },
  FROGGER: {
    LEVEL_START: 'level_start',
    LEVEL_COMPLETE: 'level_complete',
    DEATH: 'death',
  },
  SOLITAIRE: {
    WIN: 'win',
    MOVE: 'move',
    VARIANT_SELECT: 'variant_select',
  },
  CHECKERS: {
    MOVE: 'move',
    CAPTURE: 'capture',
    GAME_OVER: 'game_over',
  },
  BLACKJACK: {
    STAND: 'stand',
    DOUBLE: 'double',
    SPLIT: 'split',
    HAND_START: 'hand_start',
    DEVIATION: 'deviation',
    RESULT: 'result',
    COUNT_PRACTICE_START: 'count_practice_start',
    COUNT_STREAK: 'count_streak',
  },
  GAME: {
    START: 'start',
    END: 'end',
    ERROR: 'error',
  },
} as const;

export const GA_EVENT_NAMES = {
  POST_SCORE: 'post_score',
} as const;

export const GA_EVENTS = {
  CONTEXT_MENU: {
    DESKTOP_OPEN: {
      category: GA_CATEGORY.CONTEXT_MENU,
      action: GA_ACTION.CONTEXT_MENU.DESKTOP_OPEN,
    },
    APP_OPEN: {
      category: GA_CATEGORY.CONTEXT_MENU,
      action: GA_ACTION.CONTEXT_MENU.APP_OPEN,
    },
    TASKBAR_OPEN: {
      category: GA_CATEGORY.CONTEXT_MENU,
      action: GA_ACTION.CONTEXT_MENU.TASKBAR_OPEN,
    },
    DEFAULT_OPEN: {
      category: GA_CATEGORY.CONTEXT_MENU,
      action: GA_ACTION.CONTEXT_MENU.DEFAULT_OPEN,
    },
  },
  OPEN_APP: (id: string) => ({
    category: GA_CATEGORY.OPEN_APP,
    action: `Opened ${id} window`,
  }),
  SCREEN_CHANGE: {
    LOCK: {
      category: GA_CATEGORY.SCREEN_CHANGE,
      action: GA_ACTION.SCREEN_CHANGE.LOCK,
    },
    SHUTDOWN: {
      category: GA_CATEGORY.SCREEN_CHANGE,
      action: GA_ACTION.SCREEN_CHANGE.SHUTDOWN,
    },
  },
  RESUME: {
    DOWNLOAD: {
      category: GA_CATEGORY.RESUME,
      action: GA_ACTION.RESUME.DOWNLOAD,
    },
  },
  CONTACT: {
    SUBMIT_SUCCESS: {
      category: GA_CATEGORY.CONTACT,
      action: GA_ACTION.CONTACT.SUBMIT_SUCCESS,
    },
  },
  FROGGER: {
    LEVEL_START: (value: number) => ({
      category: GA_CATEGORY.FROGGER,
      action: GA_ACTION.FROGGER.LEVEL_START,
      value,
    }),
    LEVEL_COMPLETE: (value: number) => ({
      category: GA_CATEGORY.FROGGER,
      action: GA_ACTION.FROGGER.LEVEL_COMPLETE,
      value,
    }),
    DEATH: (value: number) => ({
      category: GA_CATEGORY.FROGGER,
      action: GA_ACTION.FROGGER.DEATH,
      value,
    }),
  },
  SOLITAIRE: {
    WIN: {
      category: GA_CATEGORY.SOLITAIRE,
      action: GA_ACTION.SOLITAIRE.WIN,
    },
    MOVE: (label: string) => ({
      category: GA_CATEGORY.SOLITAIRE,
      action: GA_ACTION.SOLITAIRE.MOVE,
      label,
    }),
    VARIANT_SELECT: (label: string) => ({
      category: GA_CATEGORY.SOLITAIRE,
      action: GA_ACTION.SOLITAIRE.VARIANT_SELECT,
      label,
    }),
  },
  CHECKERS: {
    MOVE: (label: string) => ({
      category: GA_CATEGORY.CHECKERS,
      action: GA_ACTION.CHECKERS.MOVE,
      label,
    }),
    CAPTURE: (label: string) => ({
      category: GA_CATEGORY.CHECKERS,
      action: GA_ACTION.CHECKERS.CAPTURE,
      label,
    }),
    GAME_OVER: (label: string) => ({
      category: GA_CATEGORY.CHECKERS,
      action: GA_ACTION.CHECKERS.GAME_OVER,
      label,
    }),
  },
  BLACKJACK: {
    STAND: {
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.STAND,
    },
    DOUBLE: {
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.DOUBLE,
    },
    SPLIT: {
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.SPLIT,
    },
    HAND_START: (value: number) => ({
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.HAND_START,
      value,
    }),
    DEVIATION: (label: string) => ({
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.DEVIATION,
      label,
    }),
    RESULT: (label?: string) => ({
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.RESULT,
      label,
    }),
    COUNT_PRACTICE_START: {
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.COUNT_PRACTICE_START,
    },
    COUNT_STREAK: (value: number) => ({
      category: GA_CATEGORY.BLACKJACK,
      action: GA_ACTION.BLACKJACK.COUNT_STREAK,
      value,
    }),
  },
  WEB_VITALS: {
    METRIC: (metric: string, id: string, value: number) => ({
      category: GA_CATEGORY.WEB_VITALS,
      action: metric,
      label: id,
      value,
      nonInteraction: true,
    }),
    ALERT: (metric: string, id: string, value: number) => ({
      category: GA_CATEGORY.PERFORMANCE_ALERT,
      action: `${metric} degraded`,
      label: id,
      value,
    }),
  },
  GAME: {
    START: (game: string) => ({
      category: game,
      action: GA_ACTION.GAME.START,
    }),
    END: (game: string, label?: string) => ({
      category: game,
      action: GA_ACTION.GAME.END,
      label,
    }),
    ERROR: (game: string, label?: string) => ({
      category: game,
      action: GA_ACTION.GAME.ERROR,
      label,
    }),
  },
} as const;

export const logEvent = (
  event: Parameters<typeof ReactGA.event>[0],
): void => {
  trackEvent(event);
};

export const logGameStart = (game: string): void => {
  trackEvent(GA_EVENTS.GAME.START(game));
};

export const logGameEnd = (game: string, label?: string): void => {
  trackEvent(GA_EVENTS.GAME.END(game, label));
};

export const logGameError = (game: string, message?: string): void => {
  trackEvent(GA_EVENTS.GAME.ERROR(game, message));
};

