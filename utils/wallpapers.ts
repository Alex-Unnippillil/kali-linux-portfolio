export const OFFICIAL_WALLPAPERS = [
  '2019.4',
  '2020.1','2020.2','2020.3','2020.4',
  '2021.1','2021.2','2021.3','2021.4',
  '2022.1','2022.2','2022.3','2022.4',
  '2023.1','2023.2','2023.3','2023.4',
  '2024.1','2024.2','2024.3','2024.4',
  '2025.1','2025.2'
] as const;

export type WallpaperId = typeof OFFICIAL_WALLPAPERS[number] | string;

export function getWallpaperUrl(id: WallpaperId): string {
  if (/^\d{4}\.\d/.test(id)) {
    return `https://images.kali.org/wallpapers/kali-linux-${id}.png`;
  }
  return `/wallpapers/${id}.webp`;
}
