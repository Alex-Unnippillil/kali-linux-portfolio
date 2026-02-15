'use client';

import { useEffect, useRef } from 'react';
import { getTowerStatsAtLevel } from '..';
import { Tower } from '../engine';

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
    const width = rect.width || canvas.width;
    const height = rect.height || canvas.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const levels = [1, 2, 3].map((level) => getTowerStatsAtLevel(tower.type, level));
    const maxRange = Math.max(...levels.map((entry) => entry.range), tower.range, 1);

    levels.forEach((entry, idx) => {
      const active = idx + 1 <= tower.level;
      ctx.strokeStyle = active ? '#fef08a' : '#475569';
      ctx.lineWidth = active ? 2 : 1;
      const radius = (entry.range / maxRange) * (width / 2 - 7);
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      ctx.font = '10px sans-serif';
      ctx.fillText(`L${idx + 1}`, width / 2 + radius + 2, height / 2 - 3);
    });
  }, [tower]);

  return <canvas ref={canvasRef} className="h-20 w-20 rounded bg-[color:var(--kali-panel)]" aria-label="Tower range by upgrade level" />;
};

export default RangeUpgradeTree;
