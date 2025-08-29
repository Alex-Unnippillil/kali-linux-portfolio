import React from 'react';
import type { LetterResult } from '../logic';

interface KeyboardProps {
  onKey: (key: string) => void;
  letterHints: Record<string, LetterResult | undefined>;
}

const rows = [
  'QWERTYUIOP'.split(''),
  'ASDFGHJKL'.split(''),
  ['ENTER', ...'ZXCVBNM'.split(''), 'BACK'],
];

// Determine button background color based on the best known result for that letter
const getKeyColor = (res?: LetterResult) =>
  res === 'correct'
    ? 'bg-green-600'
    : res === 'present'
    ? 'bg-yellow-500'
    : res === 'absent'
    ? 'bg-gray-700'
    : 'bg-gray-600';

const Keyboard: React.FC<KeyboardProps> = ({ onKey, letterHints }) => (
  <div className="select-none flex flex-col gap-1.5">
    {rows.map((row, rIdx) => (
      <div key={rIdx} className="flex justify-center gap-1.5">
        {row.map((key) => {
          const hint = letterHints[key];
          return (
            <button
              key={key}
              onClick={() => onKey(key)}
              aria-label={`${key} ${hint ?? ''}`.trim()}
              className={`h-12 px-2 rounded text-sm font-semibold text-white ${getKeyColor(
                hint
              )}`}
            >
              {key === 'BACK' ? '⌫' : key}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);

export default Keyboard;
