import {
  type Palette,
  type PaletteColor,
  defaultPalette,
  protanopiaPalette,
  deuteranopiaPalette,
  tritanopiaPalette,
  highContrastPalette,
} from './palette';

// Calculate relative luminance according to WCAG 2.1
const luminance = (hex: string): number => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

// Compute contrast ratio per WCAG formula
export const contrastRatio = (fg: string, bg: string): number => {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

// Validate that all palette entries meet a minimum contrast ratio
export const validateContrast = (palette: Palette, minRatio = 4.5): boolean =>
  Object.values(palette).every(({ fg, bg }) => contrastRatio(fg, bg) >= minRatio);

// Retrieve the appropriate palette based on color vision profile and contrast settings
type ColorProfile = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia';

const palettes: Record<ColorProfile, Palette> = {
  default: defaultPalette,
  protanopia: protanopiaPalette,
  deuteranopia: deuteranopiaPalette,
  tritanopia: tritanopiaPalette,
};

export const getThemePalette = (
  opts: { palette?: ColorProfile; highContrast?: boolean } = {},
): Palette => {
  if (opts.highContrast) return highContrastPalette;
  const name = opts.palette ?? 'default';
  return palettes[name];
};

export type { Palette, PaletteColor } from './palette';
export {
  defaultPalette,
  protanopiaPalette,
  deuteranopiaPalette,
  tritanopiaPalette,
  highContrastPalette,
} from './palette';
