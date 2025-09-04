'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

export default function WallpaperPicker() {
  const { wallpaper, setWallpaper } = useSettings();
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/wallpapers')
      .then((res) => res.json())
      .then((data: string[]) => setFiles(data))
      .catch(() => setFiles([]));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {files.map((file) => {
        const base = file.replace(/\.[^.]+$/, '');
        const selected = wallpaper === base;
        return (
          <button
            key={file}
            aria-label={`select-wallpaper-${base}`}
            aria-pressed={selected}
            onClick={() => setWallpaper(base)}
            className={`border-4 ${selected ? 'border-yellow-700' : 'border-transparent'} focus:outline-none`}
          >
            <img
              src={`/wallpapers/${file}`}
              alt={file}
              className="w-full h-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

