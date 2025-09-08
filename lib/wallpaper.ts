import { contrastRatio } from '../components/apps/Games/common/theme';

interface RGB { r: number; g: number; b: number }

const hexToRgb = (hex: string): RGB => {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
};

const rgbToHex = ({ r, g, b }: RGB): string =>
  `#${r.toString(16).padStart(2, '0')}${g
    .toString(16)
    .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

// Rough dominant color extraction by averaging sampled pixels
export const getDominantColor = async (src: string): Promise<string> => {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '#000000';
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let r = 0,
    g = 0,
    b = 0,
    count = 0;
  for (let i = 0; i < data.length; i += 40) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  r = Math.round(r / count);
  g = Math.round(g / count);
  b = Math.round(b / count);
  return rgbToHex({ r, g, b });
};

const darkenUntilContrast = (hex: string, target = 4.5): RGB => {
  let color = hexToRgb(hex);
  const toHex = () => rgbToHex(color);
  while (contrastRatio('#ffffff', toHex()) < target) {
    color = {
      r: Math.max(0, Math.floor(color.r * 0.9)),
      g: Math.max(0, Math.floor(color.g * 0.9)),
      b: Math.max(0, Math.floor(color.b * 0.9)),
    };
  }
  return color;
};

export const gradientFromColor = (hex: string): string => {
  const { r, g, b } = darkenUntilContrast(hex);
  return `linear-gradient(to top, rgba(${r}, ${g}, ${b}, 0.8) 0%, rgba(${r}, ${g}, ${b}, 0) 60%)`;
};

export const applyWallpaperGradient = async (
  src: string,
  el: HTMLElement = document.documentElement,
): Promise<void> => {
  const color = await getDominantColor(src);
  el.style.setProperty('--wallpaper-gradient', gradientFromColor(color));
};

