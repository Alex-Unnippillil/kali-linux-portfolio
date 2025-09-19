const FALLBACK_COLOR = '#1793d1';

export interface DominantColorOptions {
  sampleSize?: number;
  quality?: number;
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized.length === 3 ? normalized.repeat(2) : normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

export const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const normalize = (channel: number) => {
    const ratio = channel / 255;
    return ratio <= 0.03928 ? ratio / 12.92 : Math.pow((ratio + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
};

export async function getDominantColor(
  image: HTMLImageElement | ImageBitmap,
  options: DominantColorOptions = {},
): Promise<string> {
  if (typeof window === 'undefined' && typeof OffscreenCanvas === 'undefined') {
    return FALLBACK_COLOR;
  }

  const sampleSize = options.sampleSize ?? 96;
  const quality = Math.max(1, Math.floor(options.quality ?? 4));

  let bitmap: ImageBitmap | null = null;
  let source: CanvasImageSource = image;

  if (typeof window !== 'undefined' && 'createImageBitmap' in window && !(image instanceof ImageBitmap)) {
    try {
      bitmap = await window.createImageBitmap(image);
      source = bitmap;
    } catch (error) {
      // Silently fall back to the original image when createImageBitmap is unavailable
      bitmap = null;
      source = image;
    }
  }

  const width =
    source instanceof ImageBitmap
      ? source.width
      : (image as HTMLImageElement).naturalWidth || (image as HTMLImageElement).width;
  const height =
    source instanceof ImageBitmap
      ? source.height
      : (image as HTMLImageElement).naturalHeight || (image as HTMLImageElement).height;

  if (!width || !height) {
    bitmap?.close?.();
    return FALLBACK_COLOR;
  }

  const longestEdge = Math.max(width, height);
  const scale = Math.min(1, sampleSize / longestEdge);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(targetWidth, targetHeight);
  } else if (typeof document !== 'undefined') {
    const element = document.createElement('canvas');
    element.width = targetWidth;
    element.height = targetHeight;
    canvas = element;
  } else {
    bitmap?.close?.();
    return FALLBACK_COLOR;
  }

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap?.close?.();
    return FALLBACK_COLOR;
  }

  context.clearRect(0, 0, targetWidth, targetHeight);
  context.drawImage(source, 0, 0, targetWidth, targetHeight);
  const { data } = context.getImageData(0, 0, targetWidth, targetHeight);

  let red = 0;
  let green = 0;
  let blue = 0;
  let pixels = 0;

  for (let i = 0; i < data.length; i += 4 * quality) {
    const alpha = data[i + 3];
    if (alpha < 64) continue;
    red += data[i];
    green += data[i + 1];
    blue += data[i + 2];
    pixels += 1;
  }

  bitmap?.close?.();

  if (!pixels) {
    return FALLBACK_COLOR;
  }

  return rgbToHex(red / pixels, green / pixels, blue / pixels);
}

export { FALLBACK_COLOR as DEFAULT_ACCENT_COLOR };
