"use client";

import React, { useState, useRef, useEffect } from 'react';
import { GridSchema, ROWS, COLS } from '../../games/breakout/schema';

const KEY_PREFIX = 'breakout-level:';

const cellClass = (cell) =>
  cell === 0
    ? 'bg-gray-800'
    : cell === 1
      ? 'bg-blue-500'
      : cell === 2
        ? 'bg-green-500'
        : 'bg-red-500';

/**
 * Simple level editor for Breakout.
 * Provides a drag-and-drop grid for placing bricks and stores layouts in
 * localStorage. Cell types: 0-empty, 1-normal, 2-multi-ball, 3-magnet.
 */
export default function BreakoutEditor({ onLoad }) {
  const [grid, setGrid] = useState(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
  );
  const [name, setName] = useState('level1');
  const [error, setError] = useState('');
  const currentType = useRef(1);
  const dragging = useRef(false);

  const setCell = (r, c, t) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice());
      copy[r][c] = t;
      return copy;
    });
    setError('');
  };

  const handleDrop = (r, c) => {
    setCell(r, c, currentType.current);
  };

  const handleMouseDown = (r, c) => {
    dragging.current = true;
    handleDrop(r, c);
  };

  const handleMouseEnter = (r, c) => {
    if (dragging.current) handleDrop(r, c);
  };

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const save = () => {
    const parsed = GridSchema.safeParse(grid);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
      return;
    }
    localStorage.setItem(`${KEY_PREFIX}${name}`, JSON.stringify(parsed.data));
    setError('');
  };

  const load = () => {
    const txt = localStorage.getItem(`${KEY_PREFIX}${name}`);
    if (txt) {
      try {
        const arr = JSON.parse(txt);
        const parsed = GridSchema.safeParse(arr);
        if (parsed.success) {
          setGrid(parsed.data);
          setError('');
        } else {
          setError(parsed.error.issues.map((i) => i.message).join(', '));
        }
      } catch {
        setError('Invalid level data');
      }
    }
  };

  const play = () => {
    const parsed = GridSchema.safeParse(grid);
    if (parsed.success) {
      setError('');
      if (onLoad) onLoad(parsed.data);
    } else {
      setError(parsed.error.issues.map((i) => i.message).join(', '));
    }
  };

  return (
    <div className="text-white space-y-2">
      <div className="flex space-x-1">
        {[0, 1, 2, 3].map((t) => (
          <div
            key={t}
            draggable
            onDragStart={() => {
              currentType.current = t;
            }}
            onClick={() => {
              currentType.current = t;
            }}
            className={`w-5 h-5 cursor-pointer ${cellClass(t)}`}
          />
        ))}
      </div>
      <div
        className="grid gap-1 select-none"
        style={{ gridTemplateColumns: `repeat(${COLS}, 20px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cellClass(cell)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(r, c)}
              onMouseDown={() => handleMouseDown(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
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
          onClick={load}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Load
        </button>
        <button
          type="button"
          onClick={play}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Play
        </button>
      </div>
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
}

