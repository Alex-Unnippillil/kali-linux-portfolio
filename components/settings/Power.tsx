"use client";

import { useEffect, useState } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import Toast from '../ui/Toast';

export type BatteryVariant = 'normal' | 'charging';

const Power = () => {
  const [percent, setPercent] = usePersistentState<number>(
    'battery-percent',
    100,
    (v): v is number => typeof v === 'number',
  );
  const [variant, setVariant] = usePersistentState<BatteryVariant>(
    'battery-variant',
    'normal',
    (v): v is BatteryVariant => v === 'normal' || v === 'charging',
  );
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (percent < 20) {
      setToast('Battery low');
    }
  }, [percent]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <label htmlFor="battery-slider" className="block mb-1">
          Battery: {percent}%
        </label>
        <input
          id="battery-slider"
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => setPercent(parseInt(e.target.value))}
          className="w-full"
          aria-label="battery percentage"
        />
      </div>
      <div>
        <label htmlFor="battery-variant" className="block mb-1">
          Variant
        </label>
        <select
          id="battery-variant"
          value={variant}
          onChange={(e) => setVariant(e.target.value as BatteryVariant)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="normal">Normal</option>
          <option value="charging">Charging</option>
        </select>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default Power;
