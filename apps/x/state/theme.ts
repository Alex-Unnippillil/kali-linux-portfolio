'use client';

import { useCallback } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export type EmbedTheme = 'light' | 'dark';

export const DEFAULT_EMBED_THEME: EmbedTheme = 'light';

export const validateEmbedTheme = (value: unknown): value is EmbedTheme =>
  value === 'light' || value === 'dark';

export const getNextEmbedTheme = (theme: EmbedTheme): EmbedTheme =>
  (theme === 'dark' ? 'light' : 'dark');

export function useEmbedTheme(initial?: EmbedTheme) {
  const [theme, setTheme] = usePersistentState<EmbedTheme>(
    'x-embed-theme',
    () => initial ?? DEFAULT_EMBED_THEME,
    validateEmbedTheme,
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => getNextEmbedTheme(prev));
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
}
