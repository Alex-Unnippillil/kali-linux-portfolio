const cssVar = (name: string) => `var(${name})`;

export const kaliThemeVars = {
  background: '--color-bg',
  text: '--color-text',
  accent: '--color-primary',
  sidebar: '--color-secondary',
  panel: '--kali-panel',
  panelBorder: '--kali-panel-border',
  panelHover: '--kali-panel-highlight',
  focus: '--color-focus-ring',
  shadow: '--shadow-2',
} as const;

export const kaliTheme = {
  background: cssVar(kaliThemeVars.background),
  text: cssVar(kaliThemeVars.text),
  accent: cssVar(kaliThemeVars.accent),
  sidebar: cssVar(kaliThemeVars.sidebar),
  panel: cssVar(kaliThemeVars.panel),
  panelBorder: cssVar(kaliThemeVars.panelBorder),
  hover: cssVar(kaliThemeVars.panelHover),
  focus: cssVar(kaliThemeVars.focus),
  shadow: cssVar(kaliThemeVars.shadow),
} as const;

export type KaliTheme = typeof kaliTheme;
export type KaliThemeVars = typeof kaliThemeVars;
