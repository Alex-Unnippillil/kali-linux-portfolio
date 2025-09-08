// Utility functions for extracting accent colors from wallpaper images.
// The algorithm performs a simple color quantization by bucketing pixels
// into 4-bit RGB channels and returning the most frequent buckets as
// hexadecimal color strings.

export function extractAccentColors(
  img: HTMLImageElement,
  colorCount = 5,
): string[] {
  const width = (img.naturalWidth || img.width) || 1;
  const height = (img.naturalHeight || img.height) || 1;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  // Bucket colors by reducing each channel to 4 bits.
  type Bucket = { r: number; g: number; b: number; count: number };
  const buckets = new Map<string, Bucket>();
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 125) continue; // skip transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  const palette = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, colorCount)
    .map(({ r, g, b, count }) => {
      const rr = Math.round(r / count);
      const gg = Math.round(g / count);
      const bb = Math.round(b / count);
      return `#${((1 << 24) + (rr << 16) + (gg << 8) + bb)
        .toString(16)
        .slice(1)}`;
    });

  return palette;
}
