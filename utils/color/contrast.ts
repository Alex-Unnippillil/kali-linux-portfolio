const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const expandHex = (hex: string): string => {
  const match = HEX_PATTERN.exec(hex.trim());
  if (!match) return '#000000';
  const value = match[1];
  if (value.length === 3) {
    const [r, g, b] = value.split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return `#${value.toLowerCase()}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const expanded = expandHex(hex);
  const value = expanded.slice(1);
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
};

const toLinear = (channel: number): number => {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

export const meetsContrast = (foreground: string, background: string, minimum = 4.5): boolean =>
  contrastRatio(foreground, background) >= minimum;

type PickOptions = {
  light?: string;
  dark?: string;
  minRatio?: number;
};

export const pickTextColor = (
  background: string,
  options: PickOptions = {},
): { color: string; ratio: number; isAccessible: boolean } => {
  const { light = '#ffffff', dark = '#000000', minRatio = 4.5 } = options;
  const normalizedBackground = expandHex(background);
  const lightColor = expandHex(light);
  const darkColor = expandHex(dark);

  const lightRatio = contrastRatio(lightColor, normalizedBackground);
  const darkRatio = contrastRatio(darkColor, normalizedBackground);

  const best = lightRatio >= darkRatio
    ? { color: lightColor, ratio: lightRatio }
    : { color: darkColor, ratio: darkRatio };

  return { ...best, isAccessible: best.ratio >= minRatio };
};

export const toRgba = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(alpha, 0), 1)})`;
};

