const isBrowser = () => typeof window !== 'undefined';

const enum RGBIndex {
  R = 0,
  G = 1,
  B = 2,
  A = 3,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const toHex = (value: number) => value.toString(16).padStart(2, '0');

const rgbToHex = (r: number, g: number, b: number) =>
  `#${toHex(clamp(Math.round(r), 0, 255))}${toHex(clamp(Math.round(g), 0, 255))}${toHex(
    clamp(Math.round(b), 0, 255),
  )}`;

const rgbToHsl = (r: number, g: number, b: number) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const d = max - min;
    saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        hue = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        hue = (bn - rn) / d + 2;
        break;
      case bn:
      default:
        hue = (rn - gn) / d + 4;
        break;
    }
    hue /= 6;
  }

  return { hue, saturation, lightness };
};

const getDimensions = (source: CanvasImageSource) => {
  if ('naturalWidth' in source && 'naturalHeight' in source) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if ('videoWidth' in source && 'videoHeight' in source) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if ('width' in source && 'height' in source) {
    const width = Number((source as { width: number }).width);
    const height = Number((source as { height: number }).height);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      return { width, height };
    }
  }
  return null;
};

const loadImage = (
  source: string | CanvasImageSource,
  signal?: AbortSignal,
): Promise<{ image: CanvasImageSource; width: number; height: number }> =>
  new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('accentFromImage requires a browser environment'));
      return;
    }

    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));

    if (typeof source !== 'string') {
      const dimensions = getDimensions(source);
      if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
        reject(new Error('Invalid image dimensions'));
        return;
      }
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      resolve({ image: source, ...dimensions });
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    const cleanup = () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
      if (signal) signal.removeEventListener('abort', onAbort);
    };

    const handleLoad = () => {
      cleanup();
      const dimensions = getDimensions(img);
      if (!dimensions || dimensions.width === 0 || dimensions.height === 0) {
        reject(new Error('Invalid image dimensions'));
        return;
      }
      resolve({ image: img, ...dimensions });
    };

    const handleError = () => {
      cleanup();
      reject(new Error(`Failed to load image: ${source}`));
    };

    img.addEventListener('load', handleLoad, { once: true });
    img.addEventListener('error', handleError, { once: true });
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    img.src = source;
  });

const bucketKey = (r: number, g: number, b: number) =>
  ((r & 0xf8) << 16) | ((g & 0xf8) << 8) | (b & 0xf8);

interface ColorBucket {
  count: number;
  r: number;
  g: number;
  b: number;
}

export interface AccentFromImageOptions {
  sampleStep?: number;
  signal?: AbortSignal;
}

export async function accentFromImage(
  source: string | CanvasImageSource,
  { sampleStep = 6, signal }: AccentFromImageOptions = {},
): Promise<string | null> {
  if (!isBrowser()) return null;

  try {
    const { image, width, height } = await loadImage(source, signal);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);

    const buckets = new Map<number, ColorBucket>();
    const step = Math.max(1, Math.floor(sampleStep));

    for (let y = 0; y < height; y += step) {
      if (signal?.aborted) return null;
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + RGBIndex.A];
        if (alpha < 96) continue;
        const r = data[index + RGBIndex.R];
        const g = data[index + RGBIndex.G];
        const b = data[index + RGBIndex.B];
        const key = bucketKey(r, g, b);
        const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
        buckets.set(key, bucket);
      }
    }

    if (buckets.size === 0) return null;

    let bestHex = '';
    let bestScore = -Infinity;

    buckets.forEach((bucket) => {
      if (bucket.count === 0) return;
      const r = bucket.r / bucket.count;
      const g = bucket.g / bucket.count;
      const b = bucket.b / bucket.count;
      const { saturation, lightness } = rgbToHsl(r, g, b);
      let score = bucket.count * (0.4 + saturation * 0.6);
      if (lightness < 0.2 || lightness > 0.85) {
        score *= 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestHex = rgbToHex(r, g, b);
      }
    });

    if (bestHex) return bestHex;

    // Fallback to average color if no dominant bucket
    let totalCount = 0;
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    buckets.forEach((bucket) => {
      totalCount += bucket.count;
      totalR += bucket.r;
      totalG += bucket.g;
      totalB += bucket.b;
    });
    if (totalCount === 0) return null;
    return rgbToHex(totalR / totalCount, totalG / totalCount, totalB / totalCount);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    console.warn('[accentFromImage] failed to extract accent color', error);
    return null;
  }
}
