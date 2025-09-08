import React from 'react';
import { contrastRatio } from '../apps/Games/common/theme';

interface ColorSwatchProps {
  fg: string;
  bg: string;
  label?: string;
}

export default function ColorSwatch({ fg, bg, label }: ColorSwatchProps) {
  const ratio = contrastRatio(fg, bg);
  const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'Fail';
  const fails = ratio < 4.5;
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-32 h-16 flex items-center justify-center rounded ${
          fails ? 'ring-2 ring-red-500' : ''
        }`}
        style={{ backgroundColor: bg, color: fg }}
      >
        {label || `${fg} / ${bg}`}
      </div>
      <span className={`mt-2 text-sm ${fails ? 'text-red-600' : ''}`}>
        {`Contrast ${ratio.toFixed(2)}:1 ${level}`}
      </span>
    </div>
  );
}
