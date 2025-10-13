'use client';

import { useEffect, useRef } from 'react';
import { Tower, getTowerDPS, TowerType } from '..';


interface DpsChartsProps {
  towers: (Tower & { type?: TowerType })[];

}

const DpsCharts = ({ towers }: DpsChartsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpsMap: Partial<Record<TowerType, number>> = {};
    towers.forEach((t) => {
      const type = ((t as any).type || 'single') as TowerType;

      dpsMap[type] = (dpsMap[type] || 0) + getTowerDPS(type, t.level);
    });

    const entries = Object.entries(dpsMap) as [TowerType, number][];
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!entries.length) return;
    const max = Math.max(...entries.map(([, d]) => d), 1);
    const barWidth = w / entries.length;

    entries.forEach(([type, dps], i) => {
      const height = (dps / max) * (h - 20);
      const x = i * barWidth + 5;
      const y = h - height - 20;
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(x, y, barWidth - 10, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${type}: ${dps.toFixed(1)}`, x, h - 5);
    });
  }, [towers]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={120}
      className="bg-ub-dark-grey"
      role="img"
      aria-label="Tower DPS chart"
    />
  );
};

export default DpsCharts;
