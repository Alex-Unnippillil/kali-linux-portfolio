"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../../hooks/useSettings';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ images, initialIndex = 0 }) => {
  const { setWallpaper } = useSettings();
  const [index, setIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [intervalMs, setIntervalMs] = useState(3000);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(next, intervalMs);
    return () => clearInterval(id);
  }, [playing, intervalMs, next]);

  const rotate = (deg: number) => {
    setRotation((r) => (r + deg + 360) % 360);
  };

  const flipHorizontal = () => setFlipH((f) => !f);
  const flipVertical = () => setFlipV((f) => !f);

  const transform = `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`;

  const handleSetWallpaper = () => {
    if (images[index]) setWallpaper(images[index]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-ub-cool-grey text-white select-none">
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {images[index] && (
          <img
            src={images[index]}
            alt=""
            style={{ transform, maxWidth: '100%', maxHeight: '100%' }}
          />
        )}
      </div>

      <div className="p-2 flex flex-wrap gap-2 justify-center items-center">
        <button onClick={prev} aria-label="Previous image" className="px-2 py-1 bg-ubt-grey rounded">
          Prev
        </button>
        <button onClick={next} aria-label="Next image" className="px-2 py-1 bg-ubt-grey rounded">
          Next
        </button>
        <button onClick={() => rotate(-90)} aria-label="Rotate left" className="px-2 py-1 bg-ubt-grey rounded">
          Rotate Left
        </button>
        <button onClick={() => rotate(90)} aria-label="Rotate right" className="px-2 py-1 bg-ubt-grey rounded">
          Rotate Right
        </button>
        <button onClick={flipHorizontal} aria-label="Flip horizontal" className="px-2 py-1 bg-ubt-grey rounded">
          Flip H
        </button>
        <button onClick={flipVertical} aria-label="Flip vertical" className="px-2 py-1 bg-ubt-grey rounded">
          Flip V
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          aria-label="Toggle slideshow"
          className="px-2 py-1 bg-ubt-grey rounded"
        >
          {playing ? 'Stop' : 'Play'}
        </button>
        <input
          type="number"
          min={1000}
          step={500}
          value={intervalMs}
          onChange={(e) => setIntervalMs(Number(e.target.value))}
          aria-label="Slideshow interval (ms)"
          className="w-20 text-black px-1 py-0.5 rounded"
        />
        <button onClick={handleSetWallpaper} aria-label="Set as wallpaper" className="px-2 py-1 bg-ubt-grey rounded">
          Set as wallpaper
        </button>
      </div>

      <div className="p-2 overflow-x-auto flex gap-2 bg-ubt-grey">
        {images.map((img, i) => (
          <button
            key={img + i}
            onClick={() => setIndex(i)}
            aria-label={`View image ${i + 1}`}
            className={`border ${i === index ? 'border-blue-500' : 'border-transparent'}`}
          >
            <img src={img} alt="" className="h-16 object-cover pointer-events-none" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ImageViewer;
export const displayImageViewer = (props?: ImageViewerProps) => (
  <ImageViewer images={props?.images ?? []} initialIndex={props?.initialIndex} />
);
