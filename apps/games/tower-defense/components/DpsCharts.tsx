'use client';

import { useEffect, useRef } from 'react';
import { Tower, TowerType } from '..';

interface DpsChartsProps {
  towers: (Tower & { type?: TowerType })[];
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getCooldown = (level: number) =>
  clamp(1 - (level - 1) * 0.08, 0.3, 1.2);

const DpsCharts = ({ towers }: DpsChartsProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpsMap: Partial<Record<TowerType, number>> = {};
    towers.forEach((tower) => {
      const type = (tower.type || 'single') as TowerType;
      const cooldown = getCooldown(tower.level);
      const dps = tower.damage / cooldown;
      dpsMap[type] = (dpsMap[type] || 0) + dps;
    });

    const entries = Object.entries(dpsMap) as [TowerType, number][];
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || canvas.width;
    const h = rect.height || canvas.height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    if (!entries.length) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = '12px sans-serif';
      ctx.fillText('No towers placed yet.', 12, h / 2);
      return;
    }

    const max = Math.max(...entries.map(([, d]) => d), 1);
    const barWidth = w / entries.length;

    entries.forEach(([type, dps], i) => {
      const height = (dps / max) * (h - 28);
      const x = i * barWidth + 6;
      const y = h - height - 20;
      ctx.fillStyle = '#00f5ff';
      ctx.fillRect(x, y, barWidth - 12, height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(`${type}: ${dps.toFixed(1)} DPS`, x, h - 6);
    });
  }, [towers]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={120}
      className="bg-[color:var(--kali-panel)]"
      role="img"
      aria-label="Tower DPS chart"
    />
  );
};

export default DpsCharts;
