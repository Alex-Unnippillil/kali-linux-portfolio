'use client';

import { useEffect, useRef } from 'react';

interface Props {
  analyser: AnalyserNode | null;
}

export default function Visualizer({ analyser }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = canvas.width / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        // Default to 0 when no frequency data is available to satisfy
        // TypeScript's `noUncheckedIndexedAccess` setting.
        const value = dataArray[i] ?? 0;
        const barHeight = (value / 255) * canvas.height;
        ctx.fillStyle = `rgb(${value}, 100, 150)`;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
      }
    };
    draw();
  }, [analyser]);

  return <canvas ref={canvasRef} width={300} height={100} className="w-full h-24" />;
}

