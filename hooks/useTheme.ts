import { useEffect, useState } from 'react';
import { subscribe } from '@/src/lib/bc';
import {
  THEME_EVENT,
  THEME_KEY,
  getTheme,
  setTheme as applyTheme,
} from '../utils/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = getTheme();
        setThemeState(next);
        applyTheme(next, { broadcast: false });
      }
    };
    window.addEventListener('storage', handleStorage);
    const unsubscribe = subscribe<string>(THEME_EVENT, next => {
      setThemeState(next);
      applyTheme(next, { broadcast: false });
    });
    return () => {
      window.removeEventListener('storage', handleStorage);
      unsubscribe();
    };
  }, []);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next);

  };

  return { theme, setTheme };
};

