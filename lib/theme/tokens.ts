export type ThemeName = 'default' | 'dark' | 'neon' | 'matrix';

export interface ThemeTokens {
  /** Primary background color for the shell */
  background: string;
  /** Default text color used on backgrounds */
  text: string;
  /** Accent/brand color used for buttons and focus rings */
  primary: string;
  /** Secondary background used for panels */
  secondary: string;
  /** Accent color applied to highlights */
  accent: string;
  /** Muted surfaces for subdued UI */
  muted: string;
  /** Elevated surfaces like panels */
  surface: string;
  /** Border color for separators */
  border: string;
  /** Inverse text color when needed */
  inverse: string;
  /** Terminal text color */
  terminal: string;
  /** Deep background color for cards */
  dark: string;
}

export interface ThemeDefinition {
  id: ThemeName;
  label: string;
  description: string;
  tokens: ThemeTokens;
}

export const THEME_DEFINITIONS: Record<ThemeName, ThemeDefinition> = {
  default: {
    id: 'default',
    label: 'Default',
    description: 'Kali inspired dark shell with electric blue accents.',
    tokens: {
      background: '#0f1317',
      text: '#f5f5f5',
      primary: '#1793d1',
      secondary: '#1a1f26',
      accent: '#1793d1',
      muted: '#2a2e36',
      surface: '#1a1f26',
      border: '#2a2e36',
      inverse: '#000000',
      terminal: '#00ff00',
      dark: '#0c0f12',
    },
  },
  dark: {
    id: 'dark',
    label: 'Dark',
    description: 'High contrast midnight palette tuned for low-light.',
    tokens: {
      background: '#000000',
      text: '#e5e5e5',
      primary: '#1e88e5',
      secondary: '#121212',
      accent: '#bb86fc',
      muted: '#1f1f1f',
      surface: '#121212',
      border: '#333333',
      inverse: '#ffffff',
      terminal: '#00ff00',
      dark: '#0a0a0a',
    },
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    description: 'Cyberpunk glow with magenta highlights on black.',
    tokens: {
      background: '#000000',
      text: '#ffffff',
      primary: '#39ff14',
      secondary: '#1a1a1a',
      accent: '#ff00ff',
      muted: '#222222',
      surface: '#111111',
      border: '#333333',
      inverse: '#ffffff',
      terminal: '#39ff14',
      dark: '#000000',
    },
  },
  matrix: {
    id: 'matrix',
    label: 'Matrix',
    description: 'Terminal green cascading code aesthetic.',
    tokens: {
      background: '#000000',
      text: '#00ff00',
      primary: '#00ff00',
      secondary: '#001100',
      accent: '#00ff00',
      muted: '#003300',
      surface: '#001100',
      border: '#003300',
      inverse: '#ffffff',
      terminal: '#00ff00',
      dark: '#000000',
    },
  },
};

export const THEME_ORDER: ThemeName[] = ['default', 'dark', 'neon', 'matrix'];

export const themeToCssVars = (tokens: ThemeTokens): Record<string, string> => ({
  '--color-bg': tokens.background,
  '--color-text': tokens.text,
  '--color-primary': tokens.primary,
  '--color-secondary': tokens.secondary,
  '--color-accent': tokens.accent,
  '--color-muted': tokens.muted,
  '--color-surface': tokens.surface,
  '--color-border': tokens.border,
  '--color-inverse': tokens.inverse,
  '--color-terminal': tokens.terminal,
  '--color-dark': tokens.dark,
  '--color-focus-ring': tokens.accent,
  '--color-selection': tokens.accent,
  '--color-control-accent': tokens.accent,
});

export const ensureThemeName = (value: string | null | undefined): ThemeName => {
  if (!value) return 'default';
  return Object.prototype.hasOwnProperty.call(THEME_DEFINITIONS, value)
    ? (value as ThemeName)
    : 'default';
};
