export const ACCENT_MIN_CONTRAST = 4.7;

const toLinear = (value: number): number => {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
};

const HEX_SHORT_REGEX = /^#?[0-9a-fA-F]{3}$/;
const HEX_FULL_REGEX = /^#?[0-9a-fA-F]{6}$/;

const expandShortHex = (hex: string): string =>
  hex
    .split('')
    .map((char) => char + char)
    .join('');

export const normalizeHex = (value?: string | null): string | null => {
  if (!value) return null;
  let hex = value.trim();
  if (!hex) return null;
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (HEX_SHORT_REGEX.test(`#${hex}`)) {
    hex = expandShortHex(hex);
  } else if (!HEX_FULL_REGEX.test(`#${hex}`)) {
    return null;
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return `#${hex.toLowerCase()}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex color: ${hex}`);
  const value = parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
};

export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrastRatio = (colorA: string, colorB: string): number => {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
};

export const getAccessibleTextColor = (background: string): '#000000' | '#ffffff' => {
  const normalized = normalizeHex(background);
  if (!normalized) return '#ffffff';
  const darkContrast = contrastRatio(normalized, '#000000');
  const lightContrast = contrastRatio(normalized, '#ffffff');
  return darkContrast >= lightContrast ? '#000000' : '#ffffff';
};

export const isAccessibleAccent = (
  color: string,
  minimumRatio = ACCENT_MIN_CONTRAST,
): boolean => {
  const normalized = normalizeHex(color);
  if (!normalized) return false;
  const textColor = getAccessibleTextColor(normalized);
  const ratio = contrastRatio(normalized, textColor);
  return ratio >= minimumRatio;
};
