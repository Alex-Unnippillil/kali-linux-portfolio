'use client';

import React from 'react';

interface PenetrationSliderProps {
  penetration: number;
  onChange: (val: number) => void;
}

export default function PenetrationSlider({ penetration, onChange }: PenetrationSliderProps) {
  return (
    <label className="flex items-center space-x-1">
      <span className="text-sm">Pen</span>
      <input
        type="range"
        step="0.05"
        min="0.5"
        max="0.95"
        value={penetration}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (!Number.isNaN(val)) onChange(val);
        }}
        className="w-24"
      />
      <span className="text-sm">{(penetration * 100).toFixed(0)}%</span>
    </label>
  );
}

