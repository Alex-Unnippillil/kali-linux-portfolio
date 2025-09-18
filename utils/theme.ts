import {
  THEME_DEFINITIONS,
  THEME_ORDER,
  ThemeName,
  ensureThemeName,
  themeToCssVars,
} from '../lib/theme/tokens';

export const THEME_KEY = 'app:theme';

const DARK_THEMES: ThemeName[] = ['dark', 'neon', 'matrix'];

// Score required to unlock each theme
export const THEME_UNLOCKS: Partial<Record<ThemeName, number>> = {
  default: 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(ensureThemeName(theme));

export const getTheme = (): ThemeName => {
  if (typeof window === 'undefined') return 'default';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return ensureThemeName(stored);
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'default';
  } catch {
    return 'default';
  }
};

export const setTheme = (theme: string): void => {
  if (typeof window === 'undefined') return;
  const resolved = ensureThemeName(theme);
  try {
    window.localStorage.setItem(THEME_KEY, resolved);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.classList.toggle('dark', isDarkTheme(resolved));
    const vars = themeToCssVars(THEME_DEFINITIONS[resolved].tokens);
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): ThemeName[] =>
  THEME_ORDER.filter((theme) => {
    const required = THEME_UNLOCKS[theme] ?? Number.POSITIVE_INFINITY;
    return highScore >= required;
  });

export const isThemeUnlocked = (theme: string, highScore: number): boolean => {
  const resolved = ensureThemeName(theme);
  const required = THEME_UNLOCKS[resolved] ?? Number.POSITIVE_INFINITY;
  return highScore >= required;
};
