const DATA_URL_PATTERN = /^data:image\//i;
const BLOB_URL_PATTERN = /^blob:/i;
const ABSOLUTE_PATTERN = /^(?:https?:|file:)/i;

const trimLeadingSlash = (value: string): string => value.replace(/^\/+/, '');

export const isCustomWallpaper = (value: string): boolean =>
  DATA_URL_PATTERN.test(value) || BLOB_URL_PATTERN.test(value);

export const getWallpaperUrl = (value: string): string => {
  if (!value) {
    return '/wallpapers/wall-2.webp';
  }

  if (isCustomWallpaper(value) || ABSOLUTE_PATTERN.test(value)) {
    return value;
  }

  if (value.startsWith('/')) {
    return value;
  }

  const normalized = trimLeadingSlash(value);

  if (normalized.startsWith('wallpapers/')) {
    return `/${normalized}`;
  }

  if (/\.(?:png|jpe?g|webp|avif|gif)$/i.test(normalized)) {
    return `/wallpapers/${normalized}`;
  }

  return `/wallpapers/${normalized}.webp`;
};

export const normalizeWallpaperId = (value: string): string => {
  if (!value) return value;
  if (isCustomWallpaper(value) || ABSOLUTE_PATTERN.test(value)) {
    return value;
  }
  const normalized = trimLeadingSlash(value);
  if (normalized.startsWith('wallpapers/')) {
    const withoutPrefix = normalized.replace(/^wallpapers\//, '');
    return withoutPrefix.replace(/\.(?:png|jpe?g|webp|avif|gif)$/i, '');
  }
  return normalized.replace(/\.(?:png|jpe?g|webp|avif|gif)$/i, '');
};

export const isSameWallpaper = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (isCustomWallpaper(a) || isCustomWallpaper(b)) {
    return a === b;
  }
  return normalizeWallpaperId(a) === normalizeWallpaperId(b);
};
