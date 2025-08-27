const DEFAULT_SETTINGS = {
  theme: 'dark',
  wallpaper: 'wall-2',
  accent: '#4f46e5',
  locale: 'en',
  shortcuts: [],
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

export function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return window.localStorage.getItem('accent') || DEFAULT_SETTINGS.accent;
}

export function setAccent(accent) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('accent', accent);
}

export function getLocale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.locale;
  return window.localStorage.getItem('locale') || DEFAULT_SETTINGS.locale;
}

export function setLocale(locale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('locale', locale);
}

export function getShortcuts() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.shortcuts;
  const stored = window.localStorage.getItem('shortcuts');
  return stored ? JSON.parse(stored) : DEFAULT_SETTINGS.shortcuts;
}

export function setShortcuts(shortcuts) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
}

export function resetSettings() {
  if (typeof window === 'undefined') return;
  window.localStorage.clear();
}

export const defaults = DEFAULT_SETTINGS;
