export type RGB = { r: number; g: number; b: number };

export const hexToRgb = (hex: string): RGB | null => {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return null;
  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const srgbToLinear = (value: number): number => {
  const scaled = value / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ({ r, g, b }: RGB): number =>
  0.2126 * srgbToLinear(r) +
  0.7152 * srgbToLinear(g) +
  0.0722 * srgbToLinear(b);

export const contrastRatio = (a: RGB, b: RGB): number => {
  const lumA = relativeLuminance(a);
  const lumB = relativeLuminance(b);
  const brighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (brighter + 0.05) / (darker + 0.05);
};

const WHITE: RGB = { r: 255, g: 255, b: 255 };
const BLACK: RGB = { r: 0, g: 0, b: 0 };

export const getAccessibleTextColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  return contrastRatio(rgb, BLACK) >= contrastRatio(rgb, WHITE)
    ? '#000000'
    : '#ffffff';
};
