export const THEME_KEY = 'app:theme';

const themeStorageKey = (profileId: string) => `${THEME_KEY}:${profileId}`;

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (profileId = 'default'): string => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(themeStorageKey(profileId));
    if (stored) return stored;
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (profileId: string, theme: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(themeStorageKey(profileId), theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  } catch {
    /* ignore storage errors */
  }
};

export const clearTheme = (profileId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(themeStorageKey(profileId));
  } catch {
    /* ignore */
  }
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
