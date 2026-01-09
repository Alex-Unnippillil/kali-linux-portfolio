"use client";

import React from 'react';

interface ShieldProps {
  hp: number;
  maxHp: number;
  regenProgress?: number;
  label?: string;
}

const Shield: React.FC<ShieldProps> = ({ hp, maxHp, regenProgress, label }) => {
  const clampedHp = Math.max(0, Math.min(maxHp, hp));
  const pct = maxHp > 0 ? (clampedHp / maxHp) * 100 : 0;
  const regenPct = Math.min(Math.max(regenProgress ?? 0, 0), 1) * 100;

  return (
    <div className="flex items-center gap-2" aria-label={label ?? 'shield status'}>
      {label && <span className="text-xs text-gray-200">{label}</span>}
      <div className="relative h-3 w-24 bg-gray-700 rounded-sm overflow-hidden" aria-hidden>
        <div
          className="h-full bg-cyan-400"
          style={{ width: `${pct}%`, transition: 'width 150ms linear' }}
        />
        {regenProgress !== undefined && clampedHp === 0 && (
          <div
            className="absolute inset-0 bg-cyan-200/40"
            style={{ width: `${regenPct}%` }}
          />
        )}
      </div>
      <span className="text-xs text-gray-100" aria-live="polite">
        {clampedHp}/{maxHp}
      </span>
    </div>
  );
};

export default Shield;
