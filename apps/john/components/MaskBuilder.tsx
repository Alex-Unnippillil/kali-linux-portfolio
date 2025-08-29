'use client';

import React, { useMemo, useState } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

const CHARSET_SIZES: Record<string, bigint> = {
  l: 26n,
  u: 26n,
  d: 10n,
  s: 33n,
  a: 95n,
};

function calcExpansion(mask: string): bigint {
  let total = 1n;
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === '?' && i + 1 < mask.length) {
      const size = CHARSET_SIZES[mask[i + 1]] ?? 1n;
      total *= size;
      i += 1;
    }
  }
  return total;
}

const TOKENS = ['?l', '?u', '?d', '?s', '?a'];

const MaskBuilder: React.FC = () => {
  const [mask, setMask] = useState('');
  const [saved, setSaved] = usePersistentState<string[]>(
    'john-masks',
    [],
    (v): v is string[] => Array.isArray(v) && v.every((m) => typeof m === 'string'),
  );

  const size = useMemo(() => calcExpansion(mask), [mask]);

  const addToken = (t: string) => setMask((m) => m + t);
  const save = () => {
    if (mask && !saved.includes(mask)) {
      setSaved([...saved, mask]);
    }
  };
  const remove = (m: string) => setSaved(saved.filter((s) => s !== m));

  return (
    <div className="bg-gray-800 p-3 rounded flex flex-col gap-2">
      <h2 className="text-lg">Mask Builder</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={mask}
          onChange={(e) => setMask(e.target.value)}
          className="flex-1 text-black px-2 py-1 rounded"
          placeholder="?l?l?d"
        />
        {TOKENS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => addToken(t)}
            className="px-2 py-1 bg-gray-700 rounded"
          >
            {t}
          </button>
        ))}
      </div>
      <p className="text-sm">Expansion size: {size.toLocaleString()}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          className="px-3 py-1 bg-blue-600 rounded"
        >
          Save Mask
        </button>
        <button
          type="button"
          onClick={() => setMask('')}
          className="px-3 py-1 bg-gray-700 rounded"
        >
          Clear
        </button>
      </div>
      {saved.length > 0 && (
        <div>
          <h3 className="text-md mt-2 mb-1">Saved Masks</h3>
          <ul className="flex flex-col gap-1">
            {saved.map((m) => (
              <li
                key={m}
                className="flex justify-between items-center bg-black px-2 py-1 rounded text-sm"
              >
                <span className="font-mono">{m}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs">{calcExpansion(m).toLocaleString()}</span>
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    className="text-red-400"
                    aria-label="Delete mask"
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MaskBuilder;

