'use client';

import type { ChangeEvent } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

export const GROWTH_CURVES = {
  linear: (t: number) => t,
  'ease-in': (t: number) => t * t,
  'ease-out': (t: number) => Math.sqrt(t),
  'ease-in-out': (t: number) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

export type GrowthCurve = keyof typeof GROWTH_CURVES;

export default function GrowthSettings({
  onChange,
}: {
  onChange?: (curve: GrowthCurve) => void;
}) {
  const [curve, setCurve] = usePersistentState<GrowthCurve>(
    'snake:growth-curve',
    'linear',
  );

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as GrowthCurve;
    setCurve(value);
    onChange?.(value);
  };

  return (
    <label className="flex items-center space-x-2">
      <span>Growth</span>
      <select
        className="text-black px-1 py-0.5 rounded"
        value={curve}
        onChange={handleChange}
      >
        {Object.keys(GROWTH_CURVES).map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
