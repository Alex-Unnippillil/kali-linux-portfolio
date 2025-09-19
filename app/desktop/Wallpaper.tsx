'use client';

import { useEffect, useState } from 'react';

const WALLPAPERS = [
  '/wallpapers/wall-1.webp',
  '/wallpapers/wall-2.webp',
  '/wallpapers/wall-3.webp',
  '/wallpapers/wall-4.webp',
  '/wallpapers/wall-5.webp',
  '/wallpapers/wall-6.webp',
  '/wallpapers/wall-7.webp',
  '/wallpapers/wall-8.webp',
] as const;

const ROTATION_INTERVAL_MS = 15_000;

export default function Wallpaper() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (WALLPAPERS.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % WALLPAPERS.length);
    }, ROTATION_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, []);

  const currentWallpaper = WALLPAPERS[index] ?? WALLPAPERS[0];

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${currentWallpaper})` }}
    />
  );
}
