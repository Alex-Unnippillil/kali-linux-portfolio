'use client';

import { useState } from 'react';
import Tabs from '../Tabs';
import { useSettings } from '../../hooks/useSettings';
import { useIconTheme } from '../../hooks/useIconTheme';

const STYLE_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'dark', label: 'Dark' },
  { id: 'neon', label: 'Neon' },
  { id: 'matrix', label: 'Matrix' },
];

const ICON_OPTIONS = ['Yaru', 'Papirus'];

export default function Appearance() {
  const [tab, setTab] = useState<'style' | 'icons' | 'fonts'>('style');
  const { theme, setTheme, fontScale, setFontScale } = useSettings();
  const { iconTheme, setIconTheme } = useIconTheme();

  return (
    <div>
      <Tabs
        tabs={[
          { id: 'style', label: 'Style' },
          { id: 'icons', label: 'Icons' },
          { id: 'fonts', label: 'Fonts' },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === 'style' && (
        <div className="mt-4">
          <label className="block mb-2">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
          >
            {STYLE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}
      {tab === 'icons' && (
        <div className="mt-4">
          <label className="block mb-2">Icon Theme</label>
          <select
            value={iconTheme}
            onChange={(e) => setIconTheme(e.target.value)}
            className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
          >
            {ICON_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      )}
      {tab === 'fonts' && (
        <div className="mt-4">
          <label className="block mb-2">Font Size</label>
          <input
            type="range"
            min="0.75"
            max="1.5"
            step="0.05"
            value={fontScale}
            onChange={(e) => setFontScale(parseFloat(e.target.value))}
            className="ubuntu-slider"
          />
        </div>
      )}
    </div>
  );
}

