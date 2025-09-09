'use client';

import { useSettings } from '@/hooks/useSettings';

export default function DpiSettings() {
  const { density, setDensity } = useSettings();
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Display</h1>
      <div className="flex items-center gap-2">
        <span>Interface density</span>
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as any)}
          className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
        >
          <option value="regular">Regular</option>
          <option value="compact">Compact</option>
        </select>
      </div>
    </div>
  );
}

