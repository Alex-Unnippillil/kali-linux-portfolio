import { getWallpaperUrl } from '../../../utils/wallpaper';

export type WallpaperOptionType = 'builtin' | 'custom' | 'current';

export interface WallpaperOption {
  id: string;
  label: string;
  value: string;
  src: string;
  type: WallpaperOptionType;
}

const BUILTIN_COUNT = 8;

export const BUILTIN_WALLPAPERS: WallpaperOption[] = Array.from(
  { length: BUILTIN_COUNT },
  (_, index) => {
    const id = `wall-${index + 1}`;
    return {
      id,
      label: `Wallpaper ${index + 1}`,
      value: id,
      src: getWallpaperUrl(id),
      type: 'builtin' as const,
    };
  },
);
