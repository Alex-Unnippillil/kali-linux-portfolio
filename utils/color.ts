const HEX_REGEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const expandShortHex = (value: string): string =>
  value
    .split('')
    .map((char) => char + char)
    .join('');

export const normalizeHex = (value: string): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!HEX_REGEX.test(trimmed)) return null;
  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  const hex = normalized.length === 3 ? expandShortHex(normalized) : normalized;
  return `#${hex.toLowerCase()}`;
};

type RGB = { r: number; g: number; b: number };

const hexToRgb = (hex: string): RGB | null => {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
};

const relativeLuminance = (hex: string): number => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (component: number) => {
    const channel = component / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };
  const { r, g, b } = rgb;
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  if (l1 === 0 && l2 === 0) return 1;
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

export const getPreferredTextColor = (
  background: string,
): { text: '#000000' | '#ffffff'; contrast: number } => {
  const normalized = normalizeHex(background);
  if (!normalized) return { text: '#ffffff', contrast: 1 };
  const blackContrast = contrastRatio('#000000', normalized);
  const whiteContrast = contrastRatio('#ffffff', normalized);
  return blackContrast >= whiteContrast
    ? { text: '#000000', contrast: blackContrast }
    : { text: '#ffffff', contrast: whiteContrast };
};

export const meetsContrastRequirement = (background: string, minRatio = 4.5): boolean => {
  const { contrast } = getPreferredTextColor(background);
  return contrast >= minRatio;
};

export const MIN_ACCENT_CONTRAST = 4.5;
