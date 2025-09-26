export const PRESET_PREFIX = 'preset:';
export const CUSTOM_PREFIX = 'custom:';
export const WALLPAPER_STORAGE_KEY = 'wallpaper-selection';
export const LEGACY_WALLPAPER_STORAGE_KEY = 'bg-image';

export const WALLPAPER_PRESETS = [
  {
    id: 'gradient-default',
    name: 'Aurora Gradient',
    src: '/wallpapers/gradient-default.svg',
  },
  { id: 'wall-1', name: 'Wallpaper 1', src: '/wallpapers/wall-1.webp' },
  { id: 'wall-2', name: 'Wallpaper 2', src: '/wallpapers/wall-2.webp' },
  { id: 'wall-3', name: 'Wallpaper 3', src: '/wallpapers/wall-3.webp' },
  { id: 'wall-4', name: 'Wallpaper 4', src: '/wallpapers/wall-4.webp' },
  { id: 'wall-5', name: 'Wallpaper 5', src: '/wallpapers/wall-5.webp' },
  { id: 'wall-6', name: 'Wallpaper 6', src: '/wallpapers/wall-6.webp' },
  { id: 'wall-7', name: 'Wallpaper 7', src: '/wallpapers/wall-7.webp' },
  { id: 'wall-8', name: 'Wallpaper 8', src: '/wallpapers/wall-8.webp' },
];

export const DEFAULT_WALLPAPER = makePresetWallpaper(WALLPAPER_PRESETS[0].id);

export function makePresetWallpaper(id) {
  return `${PRESET_PREFIX}${id}`;
}

export function isCustomWallpaper(value) {
  return typeof value === 'string' && value.startsWith(CUSTOM_PREFIX);
}

export function getWallpaperId(value) {
  if (!value) return WALLPAPER_PRESETS[0].id;
  if (isCustomWallpaper(value)) return null;
  if (value.startsWith(PRESET_PREFIX)) {
    return value.slice(PRESET_PREFIX.length);
  }
  return value;
}

export function getWallpaperSrc(value) {
  if (!value) return WALLPAPER_PRESETS[0].src;
  if (isCustomWallpaper(value)) {
    return value.slice(CUSTOM_PREFIX.length);
  }
  const id = getWallpaperId(value);
  const preset = WALLPAPER_PRESETS.find((item) => item.id === id);
  if (preset) return preset.src;
  return `/wallpapers/${id}.webp`;
}

export function normalizeWallpaper(value) {
  if (!value) return DEFAULT_WALLPAPER;
  if (isCustomWallpaper(value) || value.startsWith(PRESET_PREFIX)) {
    return value;
  }
  return makePresetWallpaper(value);
}
