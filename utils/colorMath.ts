export type RgbColor = { r: number; g: number; b: number };

const clampChannel = (value: number): number => Math.min(255, Math.max(0, Math.round(value)));

export const parseCssColor = (value: string | null | undefined): RgbColor => {
  if (!value) {
    return { r: 0, g: 0, b: 0 };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { r: 0, g: 0, b: 0 };
  }
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    const expanded =
      hex.length === 3
        ? hex
            .split('')
            .map((char) => char + char)
            .join('')
        : hex;
    const num = Number.parseInt(expanded, 16);
    if (Number.isNaN(num)) {
      return { r: 0, g: 0, b: 0 };
    }
    return {
      r: clampChannel((num >> 16) & 255),
      g: clampChannel((num >> 8) & 255),
      b: clampChannel(num & 255),
    };
  }

  const match = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (match) {
    const parts = match[1]
      .split(',')
      .map((part) => Number.parseFloat(part.trim()))
      .filter((channel) => !Number.isNaN(channel));
    return {
      r: clampChannel(parts[0] ?? 0),
      g: clampChannel(parts[1] ?? 0),
      b: clampChannel(parts[2] ?? 0),
    };
  }

  return { r: 0, g: 0, b: 0 };
};

export const mixRgb = (a: RgbColor, b: RgbColor, weight: number): RgbColor => {
  const clampedWeight = Math.min(1, Math.max(0, weight));
  return {
    r: clampChannel(a.r * (1 - clampedWeight) + b.r * clampedWeight),
    g: clampChannel(a.g * (1 - clampedWeight) + b.g * clampedWeight),
    b: clampChannel(a.b * (1 - clampedWeight) + b.b * clampedWeight),
  };
};

export const toRgbaString = (rgb: RgbColor, alpha = 1): string =>
  `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;

export const lightenColor = (value: string, amount: number): string =>
  toRgbaString(mixRgb(parseCssColor(value), { r: 255, g: 255, b: 255 }, amount));

export const darkenColor = (value: string, amount: number): string =>
  toRgbaString(mixRgb(parseCssColor(value), { r: 0, g: 0, b: 0 }, amount));
