'use client';

import { useEffect, useRef } from 'react';
import { TOWER_TYPES, Tower } from '..';

interface RangeUpgradeTreeProps {
  tower: Tower;
}

const RangeUpgradeTree = ({ tower }: RangeUpgradeTreeProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

    const ranges = Array.from(
      new Set(
        Object.values(TOWER_TYPES)
          .flat()
          .map((stats) => stats.range),
      ),
    ).sort((a, b) => a - b);

    const ringValues = ranges.length ? ranges : [tower.range];
    const maxRange = Math.max(...ringValues, tower.range, 1);

    ringValues.forEach((range, idx) => {
      const isActive = range <= tower.range;
      ctx.strokeStyle = isActive ? '#ffff00' : '#555555';
      ctx.lineWidth = isActive ? 2 : 1;
      const radius = (range / maxRange) * (w / 2 - 6);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();

      if (range === tower.range) {
        ctx.fillStyle = '#24f0ff';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '9px sans-serif';
      ctx.fillText(`${idx + 1}`, w / 2 + radius + 2, h / 2 - 2);
    });
  }, [tower]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={80}
      className="bg-[color:var(--kali-panel)]"
      role="img"
      aria-label="Range upgrade tree"
    />
  );
};

export default RangeUpgradeTree;
