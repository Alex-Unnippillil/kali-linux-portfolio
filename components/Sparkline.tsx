'use client';
import React, { useMemo } from 'react';

export type SparklineMode = 'led' | 'gradient' | 'fire';

interface SparklineProps {
  data: number[];
  mode: SparklineMode;
  width?: number;
  height?: number;
}

export default function Sparkline({
  data,
  mode,
  width = 100,
  height = 30,
}: SparklineProps) {
  const points = useMemo(() => {
    if (data.length === 0) return '';
    const max = Math.max(...data);
    const step = width / (data.length - 1);
    return data
      .map((d, i) => `${i * step},${height - (d / max) * height}`)
      .join(' ');
  }, [data, width, height]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="sparkline-fire" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <polyline className={`sparkline-${mode}`} points={points} />
    </svg>
  );
}
