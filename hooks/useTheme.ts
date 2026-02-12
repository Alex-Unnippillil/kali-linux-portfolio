import { useEffect, useState } from 'react';
import { themeChannel } from '../src/theming/channel';
import { THEME_KEY, getTheme, setTheme as applyTheme } from '../utils/theme';

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        const next = getTheme();
        setThemeState((current) => (current === next ? current : next));
        applyTheme(next, { broadcast: false });
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    const unsubscribe = themeChannel.subscribe((update) => {
      setThemeState((current) => (current === update.theme ? current : update.theme));
      applyTheme(update.theme, { broadcast: false });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
};

