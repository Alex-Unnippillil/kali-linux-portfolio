import { get, set, del } from 'idb-keyval';

const DEFAULT_SETTINGS = {
  theme: 'system',
  accent: '#E95420',
  wallpaper: 'wall-2',
  reducedMotion: false,
};

export async function getTheme() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.theme;
  return (await get('theme')) || DEFAULT_SETTINGS.theme;
}

export async function setTheme(theme) {
  if (typeof window === 'undefined') return;
  await set('theme', theme);
}

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const value = await get('reduced-motion');
  return typeof value === 'boolean' ? value : DEFAULT_SETTINGS.reducedMotion;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  await set('reduced-motion', value);
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('theme'),
    del('accent'),
    del('bg-image'),
    del('reduced-motion'),
  ]);
}

export const defaults = DEFAULT_SETTINGS;
