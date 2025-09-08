'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useSettings } from '../hooks/useSettings';

const BLUR_DATA_URL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

export default function WallpapersPage() {
  const { wallpaper, setWallpaper } = useSettings();
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/wallpapers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setFiles(data);
      })
      .catch(() => {
        setFiles([]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-ub-cool-grey p-4 text-white">
      <h1 className="mb-4 text-2xl font-bold">Wallpapers</h1>
      <p className="mb-6 text-ubt-grey">
        Browse the bundled wallpapers or visit the{' '}
        <a
          href="https://www.kali.org/wallpapers/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-ubt-blue"
        >
          official Kali gallery
        </a>
        .
      </p>
      <div className="mb-8">
        <Image
          src={`/images/wallpapers/${wallpaper}.webp`}
          alt="Current wallpaper preview"
          width={800}
          height={450}
          className="h-48 w-full rounded object-cover md:h-64"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {files.map((file) => {
          const base = file.replace(/\.[^.]+$/, '');
          return (
            <button
              key={file}
              type="button"
              aria-label={`Select ${base.replace('wall-', 'wallpaper ')}`}
              aria-pressed={base === wallpaper}
              onClick={() => setWallpaper(base)}
              className={`overflow-hidden rounded focus:outline-none border-4 ${
                base === wallpaper ? 'border-ub-orange' : 'border-transparent'
              }`}
            >
              <Image
                src={`/images/wallpapers/${file}`}
                alt={base}
                width={300}
                height={200}
                className="h-full w-full object-cover"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

