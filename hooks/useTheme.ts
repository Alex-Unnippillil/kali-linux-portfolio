import { useEffect, useState } from 'react';
import { getTheme, setTheme as applyTheme } from '../utils/theme';
import themeChannel from '@/src/theming/channel';

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(() => getTheme());

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      let nextTheme: string | null = null;
      if (typeof event.data === 'string') {
        nextTheme = event.data;
      } else if (event.data && typeof event.data === 'object' && 'theme' in event.data) {
        const candidate = (event.data as { theme?: unknown }).theme;
        nextTheme = typeof candidate === 'string' ? candidate : null;
      }

      if (!nextTheme) {
        return;
      }

      setThemeState(nextTheme);
      applyTheme(nextTheme, { broadcast: false });
    };

    themeChannel.addEventListener('message', handleMessage as EventListener);
    return () => {
      themeChannel.removeEventListener('message', handleMessage as EventListener);
    };
  }, []);

  const setTheme = (next: string) => {
    setThemeState(next);
    applyTheme(next);
  };

  return { theme, setTheme };
};

