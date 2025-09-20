import {
  Palette,
  PaletteColor,
  defaultPalette,
  protanopiaPalette,
  deuteranopiaPalette,
  tritanopiaPalette,
  highContrastPalette,
} from './palette';
import { contrastRatio } from '../../../../../utils/color/contrast';

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
export { contrastRatio } from '../../../../../utils/color/contrast';
