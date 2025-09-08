'use client';

import { setTheme, useTheme } from '@/lib/theme-store';
import React from 'react';

const PRESETS = [
  { value: 'default', label: 'Default' },
  { value: 'kali-dark', label: 'Kali Dark' },
  { value: 'kali-light', label: 'Kali Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'neon', label: 'Neon' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'purple', label: 'Purple' },
];

export default function Appearance() {
  const theme = useTheme();
  return (
    <div className="flex justify-center my-4">
      <label className="mr-2 text-ubt-grey">Theme:</label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
      >
        {PRESETS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
