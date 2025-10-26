export type RGB = { r: number; g: number; b: number };

const HEX_REGEX = /^#?(?<hex>[0-9a-f]{3}|[0-9a-f]{6})$/i;

const normalizeHex = (input: string, fallback = '#1793d1'): string => {
  if (!input) return fallback;
  const match = input.match(HEX_REGEX);
  if (!match?.groups?.hex) return fallback;
  const value = match.groups.hex;
  if (value.length === 3) {
    const [r, g, b] = value.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${value.toLowerCase()}`;
};

export const hexToRgb = (hex: string): RGB => {
  const normalized = normalizeHex(hex);
  const value = normalized.slice(1);
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
};

const channelToLinear = (channel: number): number => {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const luminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map(channelToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrastRatio = (foreground: string, background: string): number => {
  const [l1, l2] = [luminance(foreground), luminance(background)];
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

export const pickReadableTextColor = (
  background: string,
  lightCandidate = '#ffffff',
  darkCandidate = '#000000',
): string => {
  const lightContrast = contrastRatio(lightCandidate, background);
  const darkContrast = contrastRatio(darkCandidate, background);
  return lightContrast >= darkContrast ? lightCandidate : darkCandidate;
};

export const shadeColor = (hex: string, percent: number): string => {
  const normalized = normalizeHex(hex);
  const value = normalized.slice(1);
  const number = parseInt(value, 16);
  const target = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const r = (number >> 16) & 0xff;
  const g = (number >> 8) & 0xff;
  const b = number & 0xff;
  const newR = Math.round((target - r) * p) + r;
  const newG = Math.round((target - g) * p) + g;
  const newB = Math.round((target - b) * p) + b;
  const composite = (newR << 16) + (newG << 8) + newB;
  return `#${composite.toString(16).padStart(6, '0')}`;
};

export const ensureContrastWarning = (
  foreground: string,
  background: string,
  minimum = 4.5,
): { ratio: number; isAccessible: boolean; message: string | null } => {
  const ratio = contrastRatio(foreground, background);
  const isAccessible = ratio >= minimum;
  const message = isAccessible
    ? null
    : `Contrast ${ratio.toFixed(2)}:1 is below the recommended ${minimum}:1 threshold.`;
  return { ratio, isAccessible, message };
};

export { normalizeHex };
