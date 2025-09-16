import { useEffect, useState } from 'react';

const rgbToHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((value) => {
      const clamped = Math.max(0, Math.min(255, Math.round(value)));
      return clamped.toString(16).padStart(2, '0');
    })
    .join('')}`;

const hexToRgb = (hex: string): [number, number, number] => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;
  const int = parseInt(value, 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  return [r, g, b];
};

const colorDistance = (a: string, b: string): number => {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const dr = ar - br;
  const dg = ag - bg;
  const db = ab - bb;
  return Math.sqrt(dr * dr + dg * dg + db * db);
};

const adjustColor = (hex: string, factor: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const mix = (channel: number, target: number) =>
    Math.round(channel + (target - channel) * factor);
  if (factor >= 0) {
    return rgbToHex(mix(r, 255), mix(g, 255), mix(b, 255));
  }
  return rgbToHex(mix(r, 0), mix(g, 0), mix(b, 0));
};

const ensureVariety = (palette: string[], desired: number): string[] => {
  if (palette.length >= desired) return palette.slice(0, desired);
  const results = [...palette];
  for (const color of palette) {
    if (results.length >= desired) break;
    const lighter = adjustColor(color, 0.25);
    if (!results.some((existing) => colorDistance(existing, lighter) < 16)) {
      results.push(lighter);
    }
  }
  for (const color of palette) {
    if (results.length >= desired) break;
    const darker = adjustColor(color, -0.25);
    if (!results.some((existing) => colorDistance(existing, darker) < 16)) {
      results.push(darker);
    }
  }
  return results.slice(0, desired);
};

const buildPalette = (image: HTMLImageElement, desired: number): string[] => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];

  const maxDimension = 240;
  const scale = Math.min(
    maxDimension / image.width || 1,
    maxDimension / image.height || 1,
    1,
  );
  const width = Math.max(1, Math.floor(image.width * scale));
  const height = Math.max(1, Math.floor(image.height * scale));

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = context.getImageData(0, 0, width, height);
  } catch {
    return [];
  }

  const { data } = imageData;
  const stride = Math.max(1, Math.floor((width * height) / 5000));
  const buckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < data.length; i += 4 * stride) {
    const alpha = data[i + 3];
    if (alpha < 200) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max - min < 18) continue;
    const key = ((r & 0xf0) << 8) | ((g & 0xf0) << 4) | (b & 0xf0);
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

  const sorted = Array.from(buckets.values())
    .filter((entry) => entry.count > 0)
    .map((entry) => ({
      count: entry.count,
      color: rgbToHex(
        entry.r / entry.count,
        entry.g / entry.count,
        entry.b / entry.count,
      ),
    }))
    .sort((a, b) => b.count - a.count)
    .map((entry) => entry.color);

  const unique: string[] = [];
  for (const color of sorted) {
    if (unique.every((existing) => colorDistance(existing, color) > 24)) {
      unique.push(color);
    }
    if (unique.length >= desired) break;
  }

  if (unique.length === 0 && data.length >= 3) {
    unique.push(rgbToHex(data[0], data[1], data[2]));
  }

  return ensureVariety(unique, desired);
};

export const useAccentPalette = (
  src: string | null,
  desired = 5,
): string[] => {
  const [palette, setPalette] = useState<string[]>([]);

  useEffect(() => {
    if (!src || typeof window === 'undefined') {
      setPalette([]);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = src;

    const handleLoad = () => {
      if (cancelled) return;
      const colors = buildPalette(image, desired);
      setPalette(colors);
    };

    const handleError = () => {
      if (!cancelled) setPalette([]);
    };

    if (image.complete) {
      handleLoad();
    } else {
      image.onload = handleLoad;
      image.onerror = handleError;
    }

    return () => {
      cancelled = true;
    };
  }, [src, desired]);

  return palette;
};

export const areColorsSimilar = (a: string, b: string): boolean =>
  colorDistance(a, b) < 12;
