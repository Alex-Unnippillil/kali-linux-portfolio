'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadRistrettoConfig,
  saveRistrettoConfig,
  RistrettoConfig,
} from './config';

export default function Ristretto() {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [showPrefs, setShowPrefs] = useState(false);
  const [config, setConfig] = useState<RistrettoConfig>(loadRistrettoConfig());

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const urls = files.map((f) => URL.createObjectURL(f));
    setImages(urls);
    setIndex(0);
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (images.length === 0) return;
      if (e.key === 'ArrowRight') {
        setIndex((i) => {
          const next = i + 1;
          if (next < images.length) return next;
          return config.loop ? 0 : i;
        });
      } else if (e.key === 'ArrowLeft') {
        setIndex((i) => {
          const prev = i - 1;
          if (prev >= 0) return prev;
          return config.loop ? images.length - 1 : i;
        });
      }
    },
    [images, config.loop],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const savePrefs = () => {
    saveRistrettoConfig(config);
    setShowPrefs(false);
  };

  return (
    <div className="p-2 text-sm">
      <input
        aria-label="Open images"
        type="file"
        accept="image/*"
        multiple
        onChange={onFiles}
      />
      {images.length > 0 && (
        <div className="mt-2 flex items-center justify-center">
          <img
            src={images[index]}
            alt={`image ${index + 1}`}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>
      )}
      <div className="mt-2">
        <button
          onClick={() => setShowPrefs(true)}
          className="px-2 py-1 bg-gray-600 text-white"
        >
          Preferences
        </button>
      </div>
      {showPrefs && (
        <div role="dialog" className="mt-4 border p-2 bg-white text-black">
          <div className="flex items-center space-x-2">
            <input
              id="ristretto-loop"
              aria-label="Loop images"
              type="checkbox"
              checked={config.loop}
              onChange={(e) =>
                setConfig({ ...config, loop: e.target.checked })
              }
            />
            <label htmlFor="ristretto-loop">Loop images</label>
          </div>
          <button
            onClick={savePrefs}
            className="mt-2 px-2 py-1 bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
