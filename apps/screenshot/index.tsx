'use client';

import { useEffect, useState } from 'react';
import html2canvas from 'html2canvas';

interface Selection {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function Screenshot() {
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('screenshot-guide-shown')) {
        setShowGuide(true);
        localStorage.setItem('screenshot-guide-shown', '1');
      }
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStart(null);
        setSelection(null);
        setImage(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    if (image) return;
    setStart({ x: e.clientX, y: e.clientY });
    setSelection({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!start) return;
    const x = Math.min(e.clientX, start.x);
    const y = Math.min(e.clientY, start.y);
    const w = Math.abs(e.clientX - start.x);
    const h = Math.abs(e.clientY - start.y);
    setSelection({ x, y, w, h });
  };

  const onMouseUp = async () => {
    if (!start || !selection) return;
    try {
      const canvas = await html2canvas(document.body, { useCORS: true });
      const crop = document.createElement('canvas');
      crop.width = selection.w;
      crop.height = selection.h;
      const ctx = crop.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          canvas,
          selection.x,
          selection.y,
          selection.w,
          selection.h,
          0,
          0,
          selection.w,
          selection.h,
        );
        setImage(crop.toDataURL('image/png'));
      }
    } catch (err) {
      console.error('Failed to capture screenshot', err);
    } finally {
      setStart(null);
      setSelection(null);
    }
  };

  const copyImage = async () => {
    if (!image) return;
    try {
      const blob = await (await fetch(image)).blob();
      await navigator.clipboard?.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
    } catch (err) {
      console.error('Copy failed', err);
    }
  };

  const downloadImage = () => {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = 'screenshot.png';
    a.click();
  };

  return (
    <div className="w-full h-full relative select-none">
      {!image && (
        <div
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          {showGuide && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-2 py-1 rounded text-sm">
              Drag to select area. Press Esc to cancel.
            </div>
          )}
          {selection && (
            <div
              className="absolute border-2 border-blue-500 bg-blue-400/20"
              style={{
                left: selection.x,
                top: selection.y,
                width: selection.w,
                height: selection.h,
              }}
            />
          )}
        </div>
      )}
      {image && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/80">
          <img src={image} alt="Screenshot preview" className="max-w-full max-h-[80vh]" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyImage}
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={downloadImage}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

