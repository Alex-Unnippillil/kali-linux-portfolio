"use client";

import React, { useState, useEffect, useRef } from 'react';
import useOPFS from '../../hooks/useOPFS';

const ROWS = 5;
const COLS = 10;

/**
 * Simple level editor for Breakout.
 * Allows creating a brick layout and storing it in OPFS as JSON.
 * Cells cycle through: 0-empty, 1-normal, 2-multi-ball, 3-magnet.
 */
export default function BreakoutEditor({ onLoad }) {
  const [grid, setGrid] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const [name, setName] = useState('level1');
  const { supported, getDir, writeFile } = useOPFS();
  const dirRef = useRef(null);

  useEffect(() => {
    if (supported) {
      getDir('breakout-levels').then((d) => {
        dirRef.current = d;
      });
    }
  }, [supported, getDir]);

  const cycleCell = (r, c) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = (copy[r][c] + 1) % 4;
      return copy;
    });
  };

  const save = async () => {
    if (!dirRef.current) return;
    await writeFile(`${name}.json`, JSON.stringify(grid), dirRef.current);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(grid)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const play = () => {
    if (onLoad) onLoad(grid);
  };

  return (
    <div className="text-white space-y-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, 20px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              onClick={() => cycleCell(r, c)}
              className={
                cell === 0
                  ? 'bg-gray-800'
                  : cell === 1
                    ? 'bg-blue-500'
                    : cell === 2
                      ? 'bg-green-500'
                      : 'bg-red-500'
              }
              style={{ width: 20, height: 10 }}
            />
          )),
        )}
      </div>
      <div className="flex space-x-2">
        <input
          className="text-black px-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          onClick={save}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Save
        </button>
        <button
          type="button"
          onClick={exportJson}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Export
        </button>
        <button
          type="button"
          onClick={play}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Play
        </button>
      </div>
    </div>
  );
}

