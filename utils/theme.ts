export const THEME_KEY = 'app:theme';

export const THEMES = ['light', 'dark', 'high-contrast'] as const;
export type ThemeName = (typeof THEMES)[number];

const DARK_THEMES: ThemeName[] = ['dark', 'high-contrast'];

const isThemeName = (value: string): value is ThemeName =>
  (THEMES as readonly string[]).includes(value);

export const isDarkTheme = (theme: string): boolean =>
  isThemeName(theme) && DARK_THEMES.includes(theme);

export const getTheme = (): ThemeName => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored && isThemeName(stored)) {
      return stored;
    }
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
};

export const setTheme = (theme: ThemeName): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (): ThemeName[] => [...THEMES];

export const isThemeUnlocked = (theme: string): boolean =>
  isThemeName(theme);
