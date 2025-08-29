'use client';

import { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react';

const ramp = '@%#*+=-:. ';

const ImageToAscii = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [ascii, setAscii] = useState('');
  const [density, setDensity] = useState(80);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ascii);
    } catch {
      // ignore
    }
  };

  const processImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const scale = density / img.width;
    const w = density;
    const h = Math.floor(img.height * scale * 0.5);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    let result = '';
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const idx = (y * w + x) * 4;
        const val = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255;
        const charIdx = Math.floor((1 - val) * (ramp.length - 1));
        result += ramp[charIdx];
      }
      result += '\n';
    }
    setAscii(result);
  };

  const handleFile = (file: File) => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      processImage(img);
    };
    img.src = URL.createObjectURL(file);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  useEffect(() => {
    if (imgRef.current) {
      processImage(imgRef.current);
    }
  }, [density]);

  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="p-4 border-2 border-dashed border-gray-400 text-center rounded cursor-pointer"
      >
        <p>Drag and drop an image here or click to select</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={onChange}
          className="hidden"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Density</label>
        <input
          type="range"
          min="20"
          max="200"
          value={density}
          onChange={(e) => setDensity(Number(e.target.value))}
        />
      </div>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 bg-blue-700 rounded"
          onClick={copy}
        >
          Copy
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <pre className="bg-black text-green-400 p-2 whitespace-pre overflow-auto">
        {ascii}
      </pre>
    </div>
  );
};

export default ImageToAscii;

