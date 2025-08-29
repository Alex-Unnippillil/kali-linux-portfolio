export interface ThemePreset {
  id: string;
  label: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'default', label: 'Default' },
  { id: 'dark', label: 'Dark' },
  { id: 'neon', label: 'Neon' },
  { id: 'matrix', label: 'Matrix' },
];
