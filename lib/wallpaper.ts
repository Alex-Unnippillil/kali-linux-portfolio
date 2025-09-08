import wallpapers from '@/content/wallpapers.json';

const STORAGE_KEY = 'wallpaper';

export function listWallpapers(): string[] {
  return wallpapers;
}

export function getWallpaper(): string {
  if (typeof window === 'undefined') return wallpapers[0];
  return window.localStorage.getItem(STORAGE_KEY) || wallpapers[0];
}

export function setWallpaper(src: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, src);
  document.documentElement.style.setProperty('--background-image', `url(${src})`);
}

export const DEFAULT_WALLPAPER = wallpapers[0];
