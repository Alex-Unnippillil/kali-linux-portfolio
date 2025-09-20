import tinycolor from 'tinycolor2';
import { ensureContrast, contrastRatio } from './contrast';

export interface AccentPreparationOptions {
  background?: string;
  minContrast?: number;
  saturationRange?: [number, number];
  lightnessRange?: [number, number];
}

export interface AccentMetadata {
  color: string;
  contrast: number;
  sourceColor: string;
}

const DEFAULT_BACKGROUND = '#0f1317';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const prepareAccent = (
  color: string,
  {
    background = DEFAULT_BACKGROUND,
    minContrast = 4.5,
    saturationRange = [0.35, 0.85],
    lightnessRange = [0.25, 0.7],
  }: AccentPreparationOptions = {},
): AccentMetadata => {
  const parsed = tinycolor(color);
  const hsl = parsed.toHsl();

  hsl.s = clamp(hsl.s, saturationRange[0], saturationRange[1]);
  hsl.l = clamp(hsl.l, lightnessRange[0], lightnessRange[1]);

  const normalized = tinycolor(hsl).toHexString();
  const { color: accessible, contrast } = ensureContrast(normalized, background, {
    minContrast,
    strategy: 'auto',
  });

  return {
    color: accessible,
    contrast,
    sourceColor: parsed.toHexString(),
  };
};

export interface ExtractAccentOptions extends AccentPreparationOptions {
  sampleSize?: number;
  quality?: number;
  fallback?: string;
}

const scoreSample = (saturation: number, lightness: number): number => {
  const satWeight = 0.7;
  const lightnessWeight = 0.3;
  const balancedLightness = 1 - Math.abs(lightness - 0.5);
  return saturation * satWeight + balancedLightness * lightnessWeight;
};

export const extractAccent = async (
  imageUrl: string,
  options: ExtractAccentOptions = {},
): Promise<AccentMetadata | null> => {
  if (typeof window === 'undefined') return null;

  const {
    sampleSize = 64,
    quality = 5,
    fallback = '#1793d1',
    background = DEFAULT_BACKGROUND,
    minContrast = 4.5,
    saturationRange,
    lightnessRange,
  } = options;

  const image = new Image();
  image.crossOrigin = 'anonymous';

  const loadImage = (): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = reject;
    });

  image.src = imageUrl;

  try {
    await loadImage();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to load wallpaper for accent extraction', error);
    }
    return prepareAccent(fallback, { background, minContrast, saturationRange, lightnessRange });
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return prepareAccent(fallback, { background, minContrast, saturationRange, lightnessRange });
  }

  const aspect = image.width && image.height ? image.width / image.height : 1;
  canvas.width = sampleSize;
  canvas.height = Math.max(1, Math.round(sampleSize / (aspect || 1)));
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const step = Math.max(1, Math.floor(quality));

  type Sample = { color: string; saturation: number; lightness: number };
  const samples: Sample[] = [];

  for (let i = 0; i < imageData.length; i += 4 * step) {
    const alpha = imageData[i + 3];
    if (alpha < 64) continue;
    const color = tinycolor({
      r: imageData[i],
      g: imageData[i + 1],
      b: imageData[i + 2],
    });
    const hsl = color.toHsl();
    if (hsl.s < 0.15) continue;
    samples.push({ color: color.toHexString(), saturation: hsl.s, lightness: hsl.l });
  }

  if (!samples.length) {
    return prepareAccent(fallback, { background, minContrast, saturationRange, lightnessRange });
  }

  samples.sort((a, b) => scoreSample(b.saturation, b.lightness) - scoreSample(a.saturation, a.lightness));
  const candidate = samples[0];

  const prepared = prepareAccent(candidate.color, {
    background,
    minContrast,
    saturationRange,
    lightnessRange,
  });

  if (contrastRatio(prepared.color, background) < minContrast) {
    return prepareAccent(fallback, { background, minContrast, saturationRange, lightnessRange });
  }

  return prepared;
};
