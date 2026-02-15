'use client';

import { useEffect, useRef } from 'react';
import { TOWER_TYPES, TowerTypeKey } from '..';
import { Tower } from '../engine';

interface DpsChartsProps {
  towers: Tower[];
}

const DpsCharts = ({ towers }: DpsChartsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const map = new Map<TowerTypeKey, number>();
    towers.forEach((tower) => {
      map.set(tower.type, (map.get(tower.type) ?? 0) + tower.damage * tower.fireRate);
    });

    const entries = Array.from(map.entries());
    if (!entries.length) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('No tower DPS yet.', 8, height / 2);
      return;
    }

    const max = Math.max(...entries.map(([, dps]) => dps), 1);
    const barWidth = width / entries.length;

    entries.forEach(([type, dps], idx) => {
      const h = (dps / max) * (height - 24);
      const x = idx * barWidth + 6;
      const y = height - h - 18;
      ctx.fillStyle = TOWER_TYPES[type].color;
      ctx.fillRect(x, y, barWidth - 10, h);
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${TOWER_TYPES[type].label}: ${dps.toFixed(1)}`, x, height - 5);
    });
  }, [towers]);

  return <canvas ref={canvasRef} className="h-[120px] w-full rounded bg-[color:var(--kali-panel)]" aria-label="Tower damage chart" />;
};

export default DpsCharts;
