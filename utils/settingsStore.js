const DEFAULT_SETTINGS = {
  theme: 'dark',
  wallpaper: 'wall-2',
};

export function getTheme() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.theme;
  return window.localStorage.getItem('theme') || DEFAULT_SETTINGS.theme;
}

export function setTheme(theme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('theme', theme);
}

export function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return window.localStorage.getItem('bg-image') || DEFAULT_SETTINGS.wallpaper;
}

export function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('bg-image', wallpaper);
}

export function resetSettings() {
  if (typeof window === 'undefined') return;
  window.localStorage.clear();
}

export const defaults = DEFAULT_SETTINGS;
