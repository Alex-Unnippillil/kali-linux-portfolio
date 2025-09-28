const rawColors = {
  background: '#0f1317',
  text: '#f5f5f5',
  accent: '#1793d1',
  secondary: '#1a1f26',
  surface: '#1a1f26',
  muted: '#2a2e36',
  border: '#2a2e36',
  panel: 'rgba(26, 31, 38, 0.9)',
  panelBorder: 'rgba(255, 255, 255, 0.08)',
  panelHighlight: 'rgba(255, 255, 255, 0.05)',
  hoverSurface: 'rgba(255, 255, 255, 0.08)',
  focusRing: '#1793d1',
  textMuted: 'rgba(245, 245, 245, 0.7)',
  terminal: '#00ff00',
  inverse: '#000000',
  backdrop: 'rgba(15, 19, 23, 0.85)',
  overlayScrim: 'rgba(8, 11, 15, 0.82)',
  danger: '#dc2626',
};

const cssVar = (token: string) => `var(${token})`;

export const kaliTheme = {
  background: cssVar('--color-bg'),
  text: cssVar('--color-text'),
  accent: cssVar('--color-primary'),
  sidebar: cssVar('--color-secondary'),
  rawColors,
  colors: {
    background: cssVar('--color-bg'),
    text: cssVar('--color-text'),
    accent: cssVar('--color-primary'),
    secondary: cssVar('--color-secondary'),
    surface: cssVar('--color-surface'),
    muted: cssVar('--color-muted'),
    border: cssVar('--color-border'),
    panel: cssVar('--kali-panel'),
    panelBorder: cssVar('--kali-panel-border'),
    panelHighlight: cssVar('--kali-panel-highlight'),
    hoverSurface: cssVar('--kali-hover-surface'),
    focusRing: cssVar('--color-focus-ring'),
    textMuted: cssVar('--kali-text-muted'),
    terminal: cssVar('--color-terminal'),
    inverse: cssVar('--color-inverse'),
    backdrop: cssVar('--kali-bg'),
    overlayScrim: cssVar('--kali-overlay-scrim'),
    danger: cssVar('--color-danger'),
  },
  focus: {
    outlineColor: cssVar('--focus-outline-color'),
    outlineWidth: cssVar('--focus-outline-width'),
  },
  shadows: {
    panel: cssVar('--shadow-panel'),
    focusRing: `0 0 0 ${cssVar('--focus-outline-width')} ${cssVar('--focus-outline-color')}`,
  },
  radii: {
    sm: cssVar('--radius-sm'),
    md: cssVar('--radius-md'),
    lg: cssVar('--radius-lg'),
    xl: cssVar('--radius-6'),
    pill: cssVar('--radius-round'),
  },
  motion: {
    fast: cssVar('--motion-fast'),
    medium: cssVar('--motion-medium'),
    slow: cssVar('--motion-slow'),
  },
};

export type KaliTheme = typeof kaliTheme;
