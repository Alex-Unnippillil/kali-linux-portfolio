export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const normalizeHex = (color: string): string => {
  if (!color) return '#000000';
  let hex = color.trim();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  if (hex.length === 4) {
    const [, r, g, b] = hex;
    hex = `#${r}${r}${g}${g}${b}${b}`;
  }
  return `#${hex.slice(1, 7).padEnd(6, '0')}`.toLowerCase();
};

export const hexToRgb = (color: string): [number, number, number] => {
  const hex = normalizeHex(color);
  const num = parseInt(hex.slice(1), 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
};

export const rgbToHex = (r: number, g: number, b: number) =>
  `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;

export const mixHex = (color: string, target: string, amount: number): string => {
  const [r1, g1, b1] = hexToRgb(color);
  const [r2, g2, b2] = hexToRgb(target);
  const ratio = clamp(amount);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return rgbToHex(r, g, b);
};

export const hexToRgba = (color: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha)})`;
};

export const parseColor = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '#000000';
  if (trimmed.startsWith('#')) return normalizeHex(trimmed);
  if (trimmed.startsWith('rgb')) {
    const [r, g, b] = trimmed
      .replace(/rgba?\(/, '')
      .replace(')', '')
      .split(',')
      .slice(0, 3)
      .map((v) => parseFloat(v.trim()));
    return rgbToHex(Math.round(r), Math.round(g), Math.round(b));
  }
  return normalizeHex(trimmed);
};

export const shadeColor = (color: string, percent: number): string => {
  const hex = normalizeHex(color);
  const value = parseInt(hex.slice(1), 16);
  const target = percent < 0 ? 0 : 255;
  const weight = Math.abs(percent);
  const r = value >> 16;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const newR = Math.round((target - r) * weight) + r;
  const newG = Math.round((target - g) * weight) + g;
  const newB = Math.round((target - b) * weight) + b;
  return rgbToHex(newR, newG, newB);
};

export const relativeLuminance = (color: string): number => {
  const [r, g, b] = hexToRgb(color).map((channel) => channel / 255);
  const convert = (channel: number) =>
    channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  const [lr, lg, lb] = [r, g, b].map(convert);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
};

export const contrastRatio = (foreground: string, background: string): number => {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
};

export const pickAccessibleTextColor = (
  accent: string,
  light = '#f5f5f5',
  dark = '#0f1317',
  minContrast = 4.5,
): string => {
  const normalizedLight = normalizeHex(light);
  const normalizedDark = normalizeHex(dark);
  const lightRatio = contrastRatio(accent, normalizedLight);
  const darkRatio = contrastRatio(accent, normalizedDark);
  if (lightRatio >= minContrast && lightRatio >= darkRatio) return normalizedLight;
  if (darkRatio >= minContrast && darkRatio >= lightRatio) return normalizedDark;
  return lightRatio > darkRatio ? normalizedLight : normalizedDark;
};

export const makeAccessibleSurface = (
  accent: string,
  background: string,
  text: string,
  minContrast = 4.5,
): string => {
  let mix = 0.85;
  let candidate = mixHex(accent, background, mix);
  while (contrastRatio(candidate, text) < minContrast && mix < 0.98) {
    mix += 0.02;
    candidate = mixHex(accent, background, mix);
  }
  return candidate;
};

export const makeBorderAccent = (accent: string, background: string) =>
  mixHex(accent, background, 0.65);

export const makeMutedAccent = (accent: string, background: string) =>
  mixHex(accent, background, 0.92);
