'use client';

import { useRef } from 'react';
import Presets from './components/Presets';

export default function QR() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'qr.png';
    link.click();
  };

  return (
    <div className="p-4 space-y-4 text-white bg-ub-cool-grey h-full overflow-auto">
      <Presets canvasRef={canvasRef} />
      <button
        type="button"
        onClick={downloadPng}
        className="px-2 py-1 bg-blue-600 rounded"
      >
        Download PNG
      </button>
    </div>
  );
}

