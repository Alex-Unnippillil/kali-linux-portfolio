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

    const levels = TOWER_TYPES.single.map((t) => t.range);
    const maxRange = Math.max(...levels, 1);

    levels.forEach((range, idx) => {
      ctx.strokeStyle = idx + 1 <= tower.level ? '#ffff00' : '#555555';
      const radius = (range / maxRange) * (w / 2 - 5);
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, [tower]);

  return (
    <canvas
      ref={canvasRef}
      width={80}
      height={80}
      className="bg-ub-dark-grey"
      role="img"
      aria-label="Range upgrade tree"
    />
  );
};

export default RangeUpgradeTree;
