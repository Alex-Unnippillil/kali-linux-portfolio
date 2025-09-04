import { useEffect, useState } from 'react';
import {
  getTheme,
  setTheme as storeTheme,
  THEME_KEY,
} from '../utils/theme';

export type Theme = 'default' | 'dark' | 'neon' | 'matrix';

export const useTheme = () => {
  const [theme, setThemeState] = useState<Theme>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initial = getTheme() as Theme;
    setThemeState(initial);
    storeTheme(initial);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY && e.newValue) {
        setThemeState(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    storeTheme(next);
  };

  return { theme, setTheme };
};

