export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export const parseColor = (value: string): RGBColor => {
  const trimmed = value.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex.padEnd(6, '0');
    const int = Number.parseInt(normalized.slice(0, 6), 16);
    return {
      r: (int >> 16) & 0xff,
      g: (int >> 8) & 0xff,
      b: int & 0xff,
    };
  }
  const match = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (!match) throw new Error(`Unsupported color format: ${value}`);
  const parts = match[1]
    .split(',')
    .slice(0, 3)
    .map((component) => Number.parseFloat(component.trim()));
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Unable to parse color: ${value}`);
  }
  return { r: parts[0], g: parts[1], b: parts[2] };
};

const toLinear = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = ({ r, g, b }: RGBColor) =>
  0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

export const contrastRatio = (foreground: string, background: string) => {
  const fgLum = relativeLuminance(parseColor(foreground));
  const bgLum = relativeLuminance(parseColor(background));
  const [light, dark] = fgLum > bgLum ? [fgLum, bgLum] : [bgLum, fgLum];
  return (light + 0.05) / (dark + 0.05);
};
