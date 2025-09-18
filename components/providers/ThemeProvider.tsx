import React, { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import {
  THEME_DEFINITIONS,
  THEME_ORDER,
  ThemeDefinition,
  ThemeName,
  ThemeTokens,
  ensureThemeName,
  themeToCssVars,
} from '../../lib/theme/tokens';
import { THEME_KEY, getTheme, setTheme as persistTheme } from '../../utils/theme';

export interface ThemeContextValue {
  theme: ThemeName;
  definition: ThemeDefinition;
  tokens: ThemeTokens;
  themes: ThemeDefinition[];
  setTheme: (theme: ThemeName | string) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeName>(() => ensureThemeName(getTheme()));

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const definition = THEME_DEFINITIONS[theme] ?? THEME_DEFINITIONS.default;
    const vars = themeToCssVars(definition.tokens);
    const root = document.documentElement;
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    persistTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) {
        setThemeState(ensureThemeName(event.newValue));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const themeOptions = useMemo(
    () => THEME_ORDER.map((id) => THEME_DEFINITIONS[id]),
    [],
  );

  const definition = THEME_DEFINITIONS[theme] ?? THEME_DEFINITIONS.default;

  const handleSetTheme = useCallback(
    (next: ThemeName | string) => {
      setThemeState((current) => {
        const resolved = ensureThemeName(next);
        return current === resolved ? current : resolved;
      });
    },
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      definition,
      tokens: definition.tokens,
      themes: themeOptions,
      setTheme: handleSetTheme,
    }),
    [definition, handleSetTheme, theme, themeOptions],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
