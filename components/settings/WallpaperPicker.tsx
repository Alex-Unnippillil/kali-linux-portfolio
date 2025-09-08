"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import wallpapers from '@/content/wallpapers.json';
import { getWallpaper, setWallpaper } from '@/lib/wallpaper';

const WallpaperPicker = () => {
  const [current, setCurrent] = useState<string>(getWallpaper());

  useEffect(() => {
    setWallpaper(current);
  }, [current]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
      {wallpapers.map((src) => {
        const name = src.replace('/wallpapers/', '').replace(/\.[^.]+$/, '');
        return (
          <button
            key={src}
            type="button"
            aria-label={`Select ${name.replace('wall-', 'wallpaper ')}`}
            aria-pressed={current === src}
            onClick={() => setCurrent(src)}
            className={`m-2 md:m-4 border-4 border-opacity-80 overflow-hidden ${
              current === src ? 'border-yellow-700' : 'border-transparent'
            }`}
          >
            <Image
              src={src}
              alt={`Preview of ${name}`}
              width={320}
              height={180}
              loading="lazy"
              className="object-cover w-full h-full"
            />
          </button>
        );
      })}
    </div>
  );
};

export default WallpaperPicker;
