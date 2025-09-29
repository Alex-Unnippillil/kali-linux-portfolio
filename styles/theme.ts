import themeTokens from './theme-tokens';

export const { colors, spacing, radii, shadows, motion, zIndex } = themeTokens;

export type ThemeTokens = typeof themeTokens;
export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
export type ThemeRadii = typeof radii;
export type ThemeShadows = typeof shadows;
export type ThemeMotion = typeof motion;
export type ThemeZIndex = typeof zIndex;

export default themeTokens;
