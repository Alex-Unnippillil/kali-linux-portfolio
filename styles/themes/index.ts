import { defaultTheme } from './kali';
import { darkTheme } from './dark';
import { neonTheme } from './neon';
import { matrixTheme } from './matrix';
import type { ThemeDefinition } from './types';

export const BUILT_IN_THEMES: ThemeDefinition[] = [
  defaultTheme,
  darkTheme,
  neonTheme,
  matrixTheme,
];

export const BUILT_IN_THEME_MAP: Record<string, ThemeDefinition> = Object.fromEntries(
  BUILT_IN_THEMES.map((theme) => [theme.metadata.id, theme]),
);

export type { ThemeDefinition } from './types';
export * from './types';
export { defaultTheme };
export { darkTheme };
export { neonTheme };
export { matrixTheme };
