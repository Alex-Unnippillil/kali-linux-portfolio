'use client';

import { useEffect } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

// A small collection of color palettes used to map grayscale values
const palettes: Record<string, string[]> = {
  grayscale: ['#000000', '#ffffff'],
  rainbow: ['#9400d3', '#4b0082', '#0000ff', '#00ff00', '#ffff00', '#ff7f00', '#ff0000'],
  heat: ['#000000', '#ff0000', '#ffff00', '#ffffff'],
};

interface Props {
  onChange: (palette: string[]) => void;
  mode: 'text' | 'background';
  setMode: (m: 'text' | 'background') => void;
  html: string; // html content for export
}

export default function ColorMaps({ onChange, mode, setMode, html }: Props) {
  const [selected, setSelected] = usePersistentState<string>(
    'ascii-art-palette',
    'grayscale',
    (v): v is string => typeof v === 'string' && v in palettes,
  );

  // notify parent when palette changes
  useEffect(() => {
    onChange(palettes[selected] || palettes.grayscale);
  }, [selected, onChange]);

  const exportHtml = () => {
    const content = `<pre style="font-family:monospace;line-height:1;">${html}</pre>`;
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii-art.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="px-2 py-1 text-black rounded"
      >
        {Object.keys(palettes).map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={mode === 'text'}
            onChange={() => setMode('text')}
          />
          Text
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={mode === 'background'}
            onChange={() => setMode('background')}
          />
          Background
        </label>
      </div>
      <button
        className="px-2 py-1 bg-green-700 rounded"
        onClick={exportHtml}
      >
        Download HTML
      </button>
    </div>
  );
}

export { palettes };

