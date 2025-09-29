import { themeTokens } from '../theme';

export const kaliTheme = {
  background: themeTokens.background,
  text: themeTokens.text,
  accent: themeTokens.accent,
  sidebar: 'var(--theme-color-surface)',
};

export type KaliTheme = typeof kaliTheme;
