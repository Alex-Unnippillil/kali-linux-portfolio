import tinycolor from 'tinycolor2';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const relativeLuminance = (color: string): number => {
  const { r, g, b } = tinycolor(color).toRgb();
  const linear = [r, g, b].map(channel => {
    const scaled = channel / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

export const contrastRatio = (foreground: string, background: string): number => {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const [lighter, darker] = fg > bg ? [fg, bg] : [bg, fg];
  return (lighter + 0.05) / (darker + 0.05);
};

export interface EnsureContrastOptions {
  minContrast?: number;
  strategy?: 'auto' | 'lighten' | 'darken';
  maxIterations?: number;
  step?: number;
}

export interface EnsureContrastResult {
  color: string;
  contrast: number;
  iterations: number;
}

export const ensureContrast = (
  color: string,
  background: string,
  {
    minContrast = 4.5,
    strategy = 'auto',
    maxIterations = 16,
    step = 0.03,
  }: EnsureContrastOptions = {},
): EnsureContrastResult => {
  let candidate = tinycolor(color);
  let contrast = contrastRatio(candidate.toHexString(), background);

  if (contrast >= minContrast) {
    return { color: candidate.toHexString(), contrast, iterations: 0 };
  }

  const backgroundLum = relativeLuminance(background);
  let direction: 'lighten' | 'darken';
  if (strategy === 'auto') {
    direction = relativeLuminance(candidate.toHexString()) <= backgroundLum ? 'lighten' : 'darken';
  } else {
    direction = strategy;
  }

  let iterations = 0;
  while (iterations < maxIterations && contrast < minContrast) {
    const hsl = candidate.toHsl();
    hsl.l = clamp01(hsl.l + (direction === 'lighten' ? step : -step));
    candidate = tinycolor(hsl);
    contrast = contrastRatio(candidate.toHexString(), background);
    iterations += 1;

    if ((hsl.l <= 0 || hsl.l >= 1) && strategy === 'auto') {
      direction = direction === 'lighten' ? 'darken' : 'lighten';
    }
  }

  return {
    color: candidate.toHexString(),
    contrast,
    iterations,
  };
};

export const meetsContrast = (
  foreground: string,
  background: string,
  minContrast = 4.5,
): boolean => contrastRatio(foreground, background) >= minContrast;
