const DEFAULT_MAX_DIMENSION = 128;
const DEFAULT_SAMPLE_COUNT = 6000;

const accentCache = new Map<string, string>();

export interface AccentSampleOptions {
  fallback?: string | null;
  maxDimension?: number;
  sampleCount?: number;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toHex = (value: number) => value.toString(16).padStart(2, '0');

const rgbToHex = ({ r, g, b }: RGB) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

const rgbToHsl = (r: number, g: number, b: number): HSL => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      default:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h, s, l };
};

const hslToRgb = (h: number, s: number, l: number): RGB => {
  if (s === 0) {
    const value = Math.round(l * 255);
    return { r: value, g: value, b: value };
  }

  const hueToRgb = (p: number, q: number, t: number) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = hueToRgb(p, q, h + 1 / 3);
  const g = hueToRgb(p, q, h);
  const b = hueToRgb(p, q, h - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = (err) => reject(err);
    image.src = src;
  });

const chooseDominantColor = (data: Uint8ClampedArray, sampleStep: number) => {
  const buckets = new Map<number, { weight: number; r: number; g: number; b: number }>();
  const fallback = { weight: 0, r: 0, g: 0, b: 0 };

  for (let i = 0; i < data.length; i += 4 * sampleStep) {
    const alpha = data[i + 3];
    if (alpha < 200) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const { h, s, l } = rgbToHsl(r, g, b);

    if (!Number.isFinite(s) || s < 0.18) {
      fallback.weight += 1;
      fallback.r += r;
      fallback.g += g;
      fallback.b += b;
      continue;
    }

    if (l < 0.12 || l > 0.85) continue;

    const bucket = Math.floor(((h % 1) + 1) % 1 * 12);
    const weight = s * (1 - Math.abs(l - 0.5) * 1.8);
    if (weight <= 0) continue;

    const current =
      buckets.get(bucket) ?? { weight: 0, r: 0, g: 0, b: 0 };
    current.weight += weight;
    current.r += r * weight;
    current.g += g * weight;
    current.b += b * weight;
    buckets.set(bucket, current);
  }

  let best: RGB | null = null;
  let bestWeight = 0;

  buckets.forEach((entry) => {
    if (entry.weight > bestWeight && entry.weight > 0) {
      bestWeight = entry.weight;
      best = {
        r: Math.round(entry.r / entry.weight),
        g: Math.round(entry.g / entry.weight),
        b: Math.round(entry.b / entry.weight),
      };
    }
  });

  if (!best && fallback.weight > 0) {
    best = {
      r: Math.round(fallback.r / fallback.weight),
      g: Math.round(fallback.g / fallback.weight),
      b: Math.round(fallback.b / fallback.weight),
    };
  }

  return best;
};

const enhanceColor = (rgb: RGB): RGB => {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const boostedS = clamp(s + 0.2, 0.35, 0.9);
  const balancedL = clamp(l, 0.3, 0.6);
  return hslToRgb(h, boostedS, balancedL);
};

export async function accentFromImage(
  src: string,
  options: AccentSampleOptions = {},
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return options.fallback ?? null;
  }

  if (accentCache.has(src)) {
    return accentCache.get(src)!;
  }

  const {
    fallback = null,
    maxDimension = DEFAULT_MAX_DIMENSION,
    sampleCount = DEFAULT_SAMPLE_COUNT,
  } = options;

  let image: HTMLImageElement;
  try {
    image = await loadImage(src);
  } catch {
    return fallback;
  }

  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = largestSide > maxDimension ? maxDimension / largestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return fallback;

  context.drawImage(image, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch {
    return fallback;
  }

  const totalPixels = imageData.data.length / 4;
  const sampleStep = Math.max(1, Math.floor(totalPixels / sampleCount));
  const dominant = chooseDominantColor(imageData.data, sampleStep);

  if (!dominant) return fallback;

  const enhanced = enhanceColor(dominant);
  const hex = rgbToHex(enhanced);
  accentCache.set(src, hex);
  return hex;
}
