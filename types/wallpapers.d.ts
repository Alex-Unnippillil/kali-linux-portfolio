declare module '@/utils/wallpapers' {
  export interface WallpaperPreset {
    id: string;
    name: string;
    src: string;
  }

  export const PRESET_PREFIX: string;
  export const CUSTOM_PREFIX: string;
  export const WALLPAPER_STORAGE_KEY: string;
  export const LEGACY_WALLPAPER_STORAGE_KEY: string;
  export const WALLPAPER_PRESETS: WallpaperPreset[];
  export const DEFAULT_WALLPAPER: string;
  export function makePresetWallpaper(id: string): string;
  export function isCustomWallpaper(value: string | null | undefined): boolean;
  export function getWallpaperId(value: string | null | undefined): string | null;
  export function getWallpaperSrc(value: string | null | undefined): string;
  export function normalizeWallpaper(value: string | null | undefined): string;
}
