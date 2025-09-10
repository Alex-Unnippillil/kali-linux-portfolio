import { isBrowser } from '@/utils/env';
export const THEME_KEY = 'app:theme';

// Score required to unlock each theme
export const THEME_UNLOCKS: Record<string, number> = {
  default: 0,
  'kali-light': 0,
  'kali-dark': 0,
  neon: 100,
  dark: 500,
  matrix: 1000,
};

const DARK_THEMES = ['dark', 'neon', 'matrix', 'kali-dark'] as const;

export const isDarkTheme = (theme: string): boolean =>
  DARK_THEMES.includes(theme as (typeof DARK_THEMES)[number]);

export const getTheme = (): string => {
  if (!isBrowser()) return 'kali-dark';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored && stored !== 'undercover') return stored;
    const prefersDark = window.matchMedia?.(
      '(prefers-color-scheme: dark)'
    ).matches;
    return prefersDark ? 'kali-dark' : 'kali-light';
  } catch {
    return 'kali-dark';
  }
};

export const setTheme = (theme: string): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDarkTheme(theme));
  } catch {
    /* ignore storage errors */
  }
};

export const UNDERCOVER_KEY = 'app:undercover';

export const getUndercover = (): boolean => {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(UNDERCOVER_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setUndercover = (on: boolean): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(UNDERCOVER_KEY, on ? 'true' : 'false');
    if (on) {
      document.documentElement.setAttribute('data-undercover', 'true');
    } else {
      document.documentElement.removeAttribute('data-undercover');
    }
    document.dispatchEvent(
      new CustomEvent('undercover-change', { detail: { value: on } }),
    );
  } catch {
    /* ignore storage errors */
  }
};

export const getUnlockedThemes = (highScore: number): string[] =>
  Object.entries(THEME_UNLOCKS)
    .filter(([, score]) => highScore >= score)
    .map(([theme]) => theme);

export const isThemeUnlocked = (theme: string, highScore: number): boolean =>
  highScore >= (THEME_UNLOCKS[theme] ?? Infinity);
