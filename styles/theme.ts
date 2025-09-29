export const themeTokens = {
  background: 'var(--theme-color-background)',
  surface: 'var(--theme-color-surface)',
  text: 'var(--theme-color-text)',
  accent: 'var(--theme-color-accent)',
  onAccent: 'var(--theme-color-on-accent)',
  border: 'var(--theme-border-subtle)',
  mutedText: 'var(--theme-muted-text)',
} as const;

export const highContrastTokens = {
  background: 'var(--color-hc-background)',
  text: 'var(--color-hc-text)',
  accent: 'var(--color-hc-accent)',
} as const;

export const themeVariants = {
  default: themeTokens,
  'high-contrast': {
    ...themeTokens,
    background: highContrastTokens.background,
    text: highContrastTokens.text,
    accent: highContrastTokens.accent,
    onAccent: 'var(--theme-color-on-accent)',
  },
} as const;

export type ThemeVariant = keyof typeof themeVariants;

export const getThemeTokens = (variant: ThemeVariant = 'default') =>
  themeVariants[variant];
