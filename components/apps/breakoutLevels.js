"use client";

import React, { useState, useEffect, useRef } from 'react';
import useOPFS from '../../hooks/useOPFS';

/**
 * Level selection overlay for Breakout.
 * Lists saved layouts from OPFS and allows loading them.
 */
export default function BreakoutLevels({ onSelect }) {
  const { supported, getDir, readFile } = useOPFS();
  const [levels, setLevels] = useState([]);
  const dirRef = useRef(null);

  useEffect(() => {
    if (supported) {
      getDir('breakout-levels').then(async (d) => {
        dirRef.current = d;
        if (d) {
          const arr = [];
          for await (const [name, handle] of d.entries()) {
            if (handle.kind === 'file' && name.endsWith('.json')) {
              arr.push(name.replace(/\.json$/, ''));
            }
          }
          setLevels(arr);
        }
      });
    }
  }, [supported, getDir]);

  const load = async (name) => {
    if (!dirRef.current) return;
    const txt = await readFile(`${name}.json`, dirRef.current);
    if (txt && onSelect) {
      onSelect(JSON.parse(txt));
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-75 text-white space-y-2">
      <div>Choose Level</div>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="px-2 py-1 bg-gray-700 rounded"
      >
        Default
      </button>
      {levels.map((lvl) => (
        <button
          key={lvl}
          type="button"
          onClick={() => load(lvl)}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          {lvl}
        </button>
      ))}
    </div>
  );
}

