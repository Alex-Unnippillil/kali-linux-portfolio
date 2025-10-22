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

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const background = ctx.createLinearGradient(0, 0, 0, h);
    background.addColorStop(0, 'rgba(12, 28, 44, 0.95)');
    background.addColorStop(1, 'rgba(7, 17, 29, 0.95)');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, w, h);

    const levels = TOWER_TYPES.single.map((t) => t.range);
    const maxRange = Math.max(...levels, 1);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    levels.forEach((range, idx) => {
      const unlocked = idx + 1 <= tower.level;
      const radius = (range / maxRange) * (Math.min(w, h) / 2 - 6);
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.setLineDash(unlocked ? [] : [4, 4]);
      ctx.strokeStyle = unlocked
        ? 'rgba(72, 230, 165, 0.9)'
        : 'rgba(255, 255, 255, 0.18)';
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(72, 230, 165, 0.35)';
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 10, 0);
    ctx.lineTo(w / 2 - 10, 0);
    ctx.moveTo(0, -h / 2 + 10);
    ctx.lineTo(0, h / 2 - 10);
    ctx.stroke();

    ctx.fillStyle = 'rgba(72, 230, 165, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  }, [tower]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={80}
      className="h-20 w-20 rounded-lg border border-[color:var(--kali-border)]/60 bg-[color:var(--kali-panel)]/40 shadow-inner"
      role="img"
      aria-label="Range upgrade tree"
    />
  );
};

export default RangeUpgradeTree;
