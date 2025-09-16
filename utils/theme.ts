export const THEME_KEY = 'app:theme';
export const THEME_STATE_KEY = 'app:theme-state';

export interface ThemePreferences {
  accent?: string;
  wallpaper?: string;
}

interface ThemeState {
  active: string;
  preferences: Record<string, ThemePreferences>;
}

const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;

const sanitizePreferences = (value: ThemePreferences): ThemePreferences => {
  const sanitized: ThemePreferences = {};
  if (typeof value.accent === 'string' && value.accent.trim()) {
    sanitized.accent = value.accent;
  }
  if (typeof value.wallpaper === 'string' && value.wallpaper) {
    sanitized.wallpaper = value.wallpaper;
  }
  return sanitized;
};

const sanitizePreferenceMap = (
  map: Record<string, ThemePreferences>,
): Record<string, ThemePreferences> => {
  const result: Record<string, ThemePreferences> = {};
  Object.entries(map || {}).forEach(([key, value]) => {
    if (typeof key !== 'string') return;
    if (typeof value !== 'object' || value === null) return;
    const sanitized = sanitizePreferences(value);
    if (Object.keys(sanitized).length > 0) {
      result[key] = sanitized;
    }
  });
  return result;
};

const readThemeState = (): ThemeState => {
  if (typeof window === 'undefined') {
    return { active: 'default', preferences: {} };
  }
  try {
    const stored = window.localStorage.getItem(THEME_STATE_KEY);
    if (!stored) {
      return { active: getTheme(), preferences: {} };
    }
    const parsed = JSON.parse(stored);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.active === 'string' &&
      typeof parsed.preferences === 'object' &&
      parsed.preferences !== null
    ) {
      return {
        active: parsed.active,
        preferences: sanitizePreferenceMap(parsed.preferences as Record<string, ThemePreferences>),
      };
    }
  } catch {
    // ignore parse errors
  }
  return { active: getTheme(), preferences: {} };
};

const writeThemeState = (state: ThemeState): void => {
  if (typeof window === 'undefined') return;
  try {
    const sanitized: ThemeState = {
      active: state.active,
      preferences: sanitizePreferenceMap(state.preferences),
    };
    window.localStorage.setItem(THEME_STATE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage errors
  }
};

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string, preferences?: ThemePreferences): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore storage errors */
  }
  const currentState = readThemeState();
  const sanitized = preferences ? sanitizePreferences(preferences) : undefined;
  const nextPreferences = sanitized && Object.keys(sanitized).length > 0
    ? {
        ...currentState.preferences,
        [theme]: {
          ...currentState.preferences[theme],
          ...sanitized,
        },
      }
    : currentState.preferences;
  writeThemeState({ active: theme, preferences: nextPreferences });
  try {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  } catch {
    /* ignore DOM errors */
  }
};

export const getThemePreferences = (theme: string): ThemePreferences => {
  const state = readThemeState();
  return { ...(state.preferences[theme] ?? {}) };
};

export const setThemePreferences = (
  theme: string,
  updates: ThemePreferences,
): void => {
  if (typeof window === 'undefined') return;
  const sanitized = sanitizePreferences(updates);
  const currentState = readThemeState();
  if (Object.keys(sanitized).length === 0) {
    writeThemeState({ active: currentState.active || theme, preferences: currentState.preferences });
    return;
  }
  const nextPreferences = {
    ...currentState.preferences,
    [theme]: {
      ...currentState.preferences[theme],
      ...sanitized,
    },
  };
  writeThemeState({ active: currentState.active || theme, preferences: nextPreferences });
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
