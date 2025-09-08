import { useSettings } from '@/hooks/useSettings';

/**
 * Provides the current wallpaper URL based on user settings.
 */
export function useWallpaper(): string {
  const { wallpaper } = useSettings();
  return `/wallpapers/${wallpaper}.webp`;
}
