import React, { useState } from 'react';
import { contrastRatio } from '../apps/Games/common/theme';

export default function ContrastChecker() {
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const ratio = contrastRatio(fg, bg);
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  const fails = ratio < 4.5;

  return (
    <div className={`p-4 border rounded ${fails ? 'border-red-500' : 'border-gray-200'}`}>
      <h2 className="text-xl font-bold mb-2">Contrast Ratio Calculator</h2>
      <p className="mb-4 text-sm">
        Select colors to verify they meet WCAG guidelines before use.
      </p>
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2">
          <span className="text-sm">Foreground</span>
          <input
            aria-label="Foreground color"
            type="color"
            value={fg}
            onChange={(e) => setFg(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-sm">Background</span>
          <input
            aria-label="Background color"
            type="color"
            value={bg}
            onChange={(e) => setBg(e.target.value)}
          />
        </label>
      </div>
      <div className="flex items-center gap-4">
        <div
          className={`w-20 h-10 flex items-center justify-center rounded ${
            fails ? 'ring-2 ring-red-500' : ''
          }`}
          style={{ backgroundColor: bg, color: fg }}
        >
          Aa
        </div>
        <span className={`text-sm ${fails ? 'text-red-600' : 'text-green-700'}`}>
          {`Contrast ${ratio.toFixed(2)}:1 ${level}`}
        </span>
      </div>
    </div>
  );
}
