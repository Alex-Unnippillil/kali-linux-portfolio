"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BREAKOUT_COLS,
  BREAKOUT_ROWS,
  BREAKOUT_STORAGE_PREFIX,
  DEFAULT_LAYOUT,
  normalizeLayout,
} from './breakoutPresets';

const cellClass = (cell, active) => {
  const base =
    cell === 0
      ? 'bg-slate-900'
      : cell === 1
        ? 'bg-blue-500'
        : cell === 2
          ? 'bg-emerald-400'
          : 'bg-rose-500';
  return `${base} ${active ? 'ring-2 ring-amber-400' : 'ring-1 ring-slate-700/80'}`;
};

const BRUSHES = [
  { type: 0, label: 'Eraser' },
  { type: 1, label: 'Normal brick' },
  { type: 2, label: 'Multi-ball brick' },
  { type: 3, label: 'Magnet brick' },
];

const listSaved = () => {
  const saved = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith(BREAKOUT_STORAGE_PREFIX)) {
      saved.push(key.slice(BREAKOUT_STORAGE_PREFIX.length));
    }
  }
  return saved.sort();
};

export default function BreakoutEditor({ onLoad }) {
  const [grid, setGrid] = useState(() => normalizeLayout(DEFAULT_LAYOUT));
  const [brush, setBrush] = useState(1);
  const [name, setName] = useState('level1');
  const [savedLevels, setSavedLevels] = useState([]);
  const [selectedSaved, setSelectedSaved] = useState('');
  const pointerDown = useRef(false);

  const refreshSaved = useCallback(() => {
    try {
      setSavedLevels(listSaved());
    } catch {
      setSavedLevels([]);
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  useEffect(() => {
    const endPointer = () => {
      pointerDown.current = false;
    };
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    return () => {
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
    };
  }, []);

  const updateCell = useCallback((r, c, value) => {
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = value;
      return next;
    });
  }, []);

  const handlePaint = useCallback(
    (r, c) => {
      updateCell(r, c, brush);
    },
    [brush, updateCell],
  );

  const handlePointerDown = useCallback(
    (r, c) => {
      pointerDown.current = true;
      handlePaint(r, c);
    },
    [handlePaint],
  );

  const handlePointerEnter = useCallback(
    (r, c) => {
      if (pointerDown.current) handlePaint(r, c);
    },
    [handlePaint],
  );

  const handleCellKey = useCallback(
    (e, r, c) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handlePaint(r, c);
      }
    },
    [handlePaint],
  );

  const saveLevel = useCallback(() => {
    try {
      localStorage.setItem(
        `${BREAKOUT_STORAGE_PREFIX}${name}`,
        JSON.stringify(grid),
      );
    } catch {
      /* ignore */
    }
    refreshSaved();
    setSelectedSaved(name);
  }, [grid, name, refreshSaved]);

  const loadLevel = useCallback(
    (levelName) => {
      if (!levelName) return;
      try {
        const raw = localStorage.getItem(
          `${BREAKOUT_STORAGE_PREFIX}${levelName}`,
        );
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setGrid(normalizeLayout(parsed));
        setName(levelName);
      } catch {
        /* ignore */
      }
    },
    [],
  );

  const deleteLevel = useCallback(
    (levelName) => {
      if (!levelName) return;
      try {
        localStorage.removeItem(`${BREAKOUT_STORAGE_PREFIX}${levelName}`);
      } catch {
        /* ignore */
      }
      refreshSaved();
      if (selectedSaved === levelName) setSelectedSaved('');
    },
    [refreshSaved, selectedSaved],
  );

  const clearGrid = useCallback(() => {
    setGrid(Array.from({ length: BREAKOUT_ROWS }, () => Array(BREAKOUT_COLS).fill(0)));
  }, []);

  const playLevel = useCallback(() => {
    onLoad?.(grid, name);
  }, [grid, name, onLoad]);

  const savedOptions = useMemo(
    () =>
      savedLevels.map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      )),
    [savedLevels],
  );

  return (
    <div className="text-white space-y-3">
      <div className="text-xs uppercase tracking-wide text-slate-400">
        Brush
      </div>
      <div className="flex flex-wrap gap-2">
        {BRUSHES.map((item) => (
          <button
            key={item.type}
            type="button"
            aria-label={item.label}
            onClick={() => setBrush(item.type)}
            className={`h-6 w-6 rounded ${
              brush === item.type ? 'ring-2 ring-amber-400' : 'ring-1 ring-slate-600'
            } ${
              item.type === 0
                ? 'bg-slate-900'
                : item.type === 1
                  ? 'bg-blue-500'
                  : item.type === 2
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
            }`}
          />
        ))}
      </div>
      <div
        className="grid gap-1 select-none"
        style={{ gridTemplateColumns: `repeat(${BREAKOUT_COLS}, 20px)` }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              onPointerDown={() => handlePointerDown(r, c)}
              onPointerEnter={() => handlePointerEnter(r, c)}
              onKeyDown={(e) => handleCellKey(e, r, c)}
              className={cellClass(cell, brush === cell)}
              style={{ width: 20, height: 12 }}
              aria-label={`Cell ${r + 1}-${c + 1}`}
            />
          )),
        )}
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-400">
          Level name
        </label>
        <input
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveLevel}
          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          Save
        </button>
        <button
          type="button"
          onClick={clearGrid}
          className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={playLevel}
          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500"
        >
          Play
        </button>
      </div>
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-wide text-slate-400">
          Saved layouts
        </label>
        <select
          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white"
          value={selectedSaved}
          onChange={(e) => {
            setSelectedSaved(e.target.value);
            loadLevel(e.target.value);
          }}
        >
          <option value="">Select a saved layout</option>
          {savedOptions}
        </select>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadLevel(selectedSaved)}
            className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
          >
            Load
          </button>
          <button
            type="button"
            onClick={() => deleteLevel(selectedSaved)}
            className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
