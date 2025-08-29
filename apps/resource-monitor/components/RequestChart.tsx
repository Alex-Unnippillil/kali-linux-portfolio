'use client';

import React, { useEffect, useRef } from 'react';

interface RequestChartProps {
  data: number[];
  label: string;
}

export default function RequestChart({ data, label }: RequestChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // draw panel background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--kali-panel');
    ctx.fillRect(0, 0, width, height);

    // gridlines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    if (data.length > 0) {
      const maxVal = Math.max(...data);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = (i / (data.length - 1 || 1)) * width;
        const y = height - (v / maxVal) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // legend
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText(label, 4, 12);
  }, [data, label]);

  return (
    <div className="w-full max-w-[300px] h-[150px]" style={{ background: 'var(--kali-panel)' }}>
      <canvas ref={canvasRef} width={300} height={150} className="w-full h-full" />
    </div>
  );
}

