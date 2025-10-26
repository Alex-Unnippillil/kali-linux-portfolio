import { useEffect, useState } from 'react';
import { subscribeToThemeUpdates } from '../src/theming/channel';
import { THEME_KEY, getTheme, setTheme as applyTheme } from '../utils/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    const unsubscribeChannel = subscribeToThemeUpdates((next) => {
      setThemeState(next);
      applyTheme(next, { broadcast: false });
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = getTheme();
        setThemeState(next);
        applyTheme(next, { broadcast: false });
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribeChannel();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
};

