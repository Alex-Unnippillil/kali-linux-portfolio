import { useEffect, useState } from 'react';

const THEME_KEY = 'app-theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(THEME_KEY);
    let initial: 'light' | 'dark' = 'light';
    if (stored === 'light' || stored === 'dark') {
      initial = stored;
    } else {
      const prefersDark = window.matchMedia?.(
        '(prefers-color-scheme: dark)'
      ).matches;
      initial = prefersDark ? 'dark' : 'light';
    }
    setThemeState(initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
  }, []);

  const setTheme = (next: 'light' | 'dark') => {
    setThemeState(next);
    if (typeof window !== 'undefined') {
      document.documentElement.classList.toggle('dark', next === 'dark');
      window.localStorage.setItem(THEME_KEY, next);
    }
  };

  return { theme, setTheme };
};

