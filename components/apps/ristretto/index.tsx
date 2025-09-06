'use client';

import React, { useEffect, useState } from 'react';

interface ImageEntry {
  name: string;
  handle: FileSystemFileHandle;
  url?: string;
}

export default function Ristretto() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const data = (window as any).__ristretto;
    if (!data) return;
    const load = async () => {
      const items: ImageEntry[] = [];
      for (const f of data.files as ImageEntry[]) {
        try {
          const file = await f.handle.getFile();
          const url = URL.createObjectURL(file);
          items.push({ ...f, url });
        } catch {
          // ignore errors loading individual images
        }
      }
      setImages(items);
      setIndex(data.index ?? 0);
    };
    load();
  }, []);

  const prev = () => setIndex(i => (i > 0 ? i - 1 : images.length - 1));
  const next = () => setIndex(i => (i + 1) % images.length);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      images.forEach(img => img.url && URL.revokeObjectURL(img.url));
    };
  }, [images]);

  if (!images.length) {
    return <div className="p-4 text-white">No images</div>;
  }

  return (
    <div className="flex flex-col w-full h-full bg-black text-white">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <img src={images[index].url} alt={images[index].name} className="max-w-full max-h-full" />
      </div>
      <div className="h-24 overflow-x-auto flex bg-gray-900">
        {images.map((img, i) => (
          <img
            key={i}
            src={img.url}
            alt={img.name}
            onClick={() => setIndex(i)}
            className={`h-full cursor-pointer ${i === index ? 'ring-2 ring-blue-500' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
