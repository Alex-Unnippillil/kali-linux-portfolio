'use client';

import { useCallback, useEffect, useState } from 'react';

interface LightboxImage {
  src: string;
  title: string;
  description: string;
}

interface LightboxProps {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}

export default function Lightbox({ images, startIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const [zoom, setZoom] = useState(false);
  const [cache, setCache] = useState<Record<number, string>>({});

  const loadImage = useCallback(
    async (i: number) => {
      if (i < 0 || i >= images.length || cache[i]) return;
      const url = images[i].src;
      const img: HTMLImageElement = await new Promise((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);
      const type = url.endsWith('.jpg') || url.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
      const data = canvas.toDataURL(type);
      setCache((c) => ({ ...c, [i]: data }));
    },
    [images, cache]
  );

  useEffect(() => {
    loadImage(index);
    loadImage(index + 1);
    loadImage(index - 1);
  }, [index, loadImage]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
    },
    [images.length, onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const current = cache[index];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" role="dialog" aria-modal="true">
      {current ? (
        <img
          src={current}
          alt={images[index].title}
          className={`max-h-full max-w-full object-contain transition-transform ${
            zoom ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
          }`}
          onClick={() => setZoom((z) => !z)}
        />
      ) : (
        <p className="text-white">Loading...</p>
      )}
      <p className="absolute bottom-4 left-0 right-0 text-center text-white px-4">
        {images[index].title} — {images[index].description}
      </p>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl"
        aria-label="Close"
      >
        &times;
      </button>
      <button
        onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        onClick={() => setIndex((i) => (i + 1) % images.length)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl"
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );
}
