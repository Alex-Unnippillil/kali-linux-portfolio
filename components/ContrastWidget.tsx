import React, { useState } from 'react';
import { contrastRatio } from './apps/Games/common/theme';

export default function ContrastWidget() {
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const ratio = contrastRatio(fg, bg);
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <span>Foreground</span>
          <input
            type="color"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
            aria-label="Foreground color"
          />
        </label>
        <label className="flex items-center gap-2">
          <span>Background</span>
          <input
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
            aria-label="Background color"
          />
        </label>
      </div>
      <div
        className="w-40 h-20 flex items-center justify-center rounded"
        style={{ backgroundColor: bg, color: fg }}
      >
        Aa
      </div>
      <span className="text-sm">{`Contrast ${ratio.toFixed(2)}:1 ${level}`}</span>
    </div>
  );
}
