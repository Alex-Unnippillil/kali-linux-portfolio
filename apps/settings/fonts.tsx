'use client';

import { useSettings } from '@/hooks/useSettings';

export default function FontsSettings() {
  const { fontScale, setFontScale } = useSettings();
  return (
    <div className="p-4 text-ubt-grey">
      <h1 className="text-xl mb-4">Fonts</h1>
      <div className="flex items-center gap-2">
        <span>Font scale</span>
        <input
          type="range"
          min="0.75"
          max="1.5"
          step="0.05"
          value={fontScale}
          onChange={(e) => setFontScale(parseFloat(e.target.value))}
          className="ubuntu-slider"
          aria-label="Font scale"
        />
      </div>
    </div>
  );
}

