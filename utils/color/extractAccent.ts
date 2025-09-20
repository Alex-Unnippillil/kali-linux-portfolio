import { contrastRatio } from '../../components/apps/Games/common/theme';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (c: number) =>
    clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const value = parseInt(expanded, 16);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  return [r, g, b];
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  const delta = max - min;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
    }
    h /= 6;
  }

  return [h, s, l];
};

const hueToRgb = (p: number, q: number, t: number): number => {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1 / 6) return p + (q - p) * 6 * t;
  if (t < 1 / 2) return q;
  if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
  return p;
};

const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
  if (s === 0) {
    const gray = Math.round(l * 255);
    return [gray, gray, gray];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const luminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ensureContrast = (
  h: number,
  s: number,
  l: number,
  backgrounds: string[],
  minRatio: number,
): { hex: string; lightness: number } => {
  let currentL = clamp(l, 0, 1);
  let hex = rgbToHex(...hslToRgb(h, s, currentL));
  const maxIterations = 24;
  const step = 0.02;

  const passes = () =>
    backgrounds.every((bg) => contrastRatio(hex, bg) >= minRatio);

  let iterations = 0;
  while (!passes() && iterations < maxIterations) {
    iterations += 1;
    const worst = backgrounds.reduce(
      (lowest, bg) => {
        const ratio = contrastRatio(hex, bg);
        if (ratio < lowest.ratio) {
          return { bg, ratio };
        }
        return lowest;
      },
      { bg: backgrounds[0], ratio: Number.POSITIVE_INFINITY },
    );
    const accentIsDarker = luminance(hex) < luminance(worst.bg);
    currentL = clamp(currentL + (accentIsDarker ? 1 : -1) * step, 0.2, 0.8);
    hex = rgbToHex(...hslToRgb(h, s, currentL));
  }

  return { hex, lightness: currentL };
};

const DEFAULT_BACKGROUNDS = ['#0f1317', '#1a1f26'];
const DEFAULT_MIN_CONTRAST = 3.5;

export interface AccentAnalysis {
  accent: string | null;
  average: string;
  palette: string[];
  needsOverlay: boolean;
}

export interface AccentExtractionOptions {
  sampleStep?: number;
  minSaturation?: number;
  maxPaletteSize?: number;
  backgrounds?: string[];
  minContrast?: number;
}

export const extractAccent = async (
  wallpaper: string,
  options: AccentExtractionOptions = {},
): Promise<AccentAnalysis> => {
  if (typeof window === 'undefined') {
    return {
      accent: null,
      average: '#000000',
      palette: [],
      needsOverlay: false,
    };
  }

  const {
    sampleStep = 12,
    minSaturation = 0.25,
    maxPaletteSize = 6,
    backgrounds: backgroundOverrides = DEFAULT_BACKGROUNDS,
    minContrast = DEFAULT_MIN_CONTRAST,
  } = options;

  const backgrounds = backgroundOverrides.length
    ? backgroundOverrides
    : DEFAULT_BACKGROUNDS;

  const source = wallpaper.startsWith('http')
    ? wallpaper
    : `/wallpapers/${wallpaper}.webp`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load wallpaper image'));
    img.src = source;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      accent: null,
      average: '#000000',
      palette: [],
      needsOverlay: false,
    };
  }

  const maxDimension = 256;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.floor(image.width * scale));
  canvas.height = Math.max(1, Math.floor(image.height * scale));

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalCount = 0;

  const stride = Math.max(1, Math.floor(sampleStep));
  for (let i = 0; i < data.length; i += stride * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    totalR += r;
    totalG += g;
    totalB += b;
    totalCount += 1;

    const key = `${Math.round(r / 32)}-${Math.round(g / 32)}-${Math.round(b / 32)}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count += 1;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const average = totalCount
    ? rgbToHex(totalR / totalCount, totalG / totalCount, totalB / totalCount)
    : '#000000';

  const palette = Array.from(buckets.values())
    .map(({ r, g, b, count }) => {
      const avgR = r / count;
      const avgG = g / count;
      const avgB = b / count;
      const [h, s, l] = rgbToHsl(avgR, avgG, avgB);
      return {
        hex: rgbToHex(avgR, avgG, avgB),
        count,
        h,
        s,
        l,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, maxPaletteSize * 3);

  let best = palette
    .filter((entry) => entry.s >= minSaturation)
    .sort((a, b) => {
      const score = (item: typeof a) =>
        item.count * (0.6 * item.s + 0.4 * (1 - Math.abs(item.l - 0.5)));
      return score(b) - score(a);
    })[0];

  if (!best && palette.length) {
    best = palette[0];
  }

  let accent: string | null = null;
  if (best) {
    const baseS = clamp(best.s, 0.35, 0.8);
    const baseL = clamp(best.l, 0.28, 0.65);
    const { hex } = ensureContrast(best.h, baseS, baseL, backgrounds, minContrast);
    accent = hex;
  }

  const needsOverlay = contrastRatio('#ffffff', average) < 4.5;

  const paletteHex = palette
    .sort((a, b) => b.count - a.count)
    .slice(0, maxPaletteSize)
    .map((entry) => entry.hex);

  return {
    accent,
    average,
    palette: paletteHex,
    needsOverlay,
  };
};

type NormalizeOptions = Partial<Pick<AccentExtractionOptions, 'backgrounds' | 'minContrast'>>;

export const normalizeAccentColor = (
  color: string,
  options: NormalizeOptions = {},
): string => {
  try {
    const [r, g, b] = hexToRgb(color);
    const [h, s, l] = rgbToHsl(r, g, b);
    const backgrounds = options.backgrounds && options.backgrounds.length
      ? options.backgrounds
      : DEFAULT_BACKGROUNDS;
    const minContrast = options.minContrast ?? DEFAULT_MIN_CONTRAST;
    const baseS = clamp(s, 0.35, 0.8);
    const baseL = clamp(l, 0.28, 0.65);
    return ensureContrast(h, baseS, baseL, backgrounds, minContrast).hex;
  } catch (error) {
    console.warn('[theme] Failed to normalize accent color', error);
    return color;
  }
};
