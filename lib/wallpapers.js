import wallpapers from '../data/wallpapers.json';

const list = Array.isArray(wallpapers) ? wallpapers : [];

export const WALLPAPERS = list;

export const DEFAULT_WALLPAPER =
  list.find((item) => item.default) || list[0] || { id: 'default-wallpaper', src: '', name: 'Default' };

export function getWallpaperById(id) {
  if (!id) {
    return DEFAULT_WALLPAPER;
  }
  return list.find((item) => item.id === id) || DEFAULT_WALLPAPER;
}

export function getWallpaperSource(id) {
  return getWallpaperById(id).src;
}

export function isValidWallpaper(id) {
  return !!list.find((item) => item.id === id);
}
