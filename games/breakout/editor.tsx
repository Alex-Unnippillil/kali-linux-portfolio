"use client";

// Interactive level editor for the Breakout game. Users can drag and
// paint bricks on a small grid and persist their creations in
// `localStorage`.
import React, { useEffect, useRef, useState } from "react";

const ROWS = 5;
const COLS = 10;
const KEY_PREFIX = "breakout-level:";

type Cell = 0 | 1 | 2 | 3;
type Grid = Cell[][];

const cellClass = (cell: Cell) =>
  cell === 0
    ? "bg-gray-800"
    : cell === 1
      ? "bg-blue-500"
      : cell === 2
        ? "bg-green-500"
        : "bg-red-500";

/**
 * Drag-and-drop level editor for Breakout.
 * Provides a grid for placing bricks and stores layouts in
 * localStorage. Cell types: 0-empty, 1-normal, 2-multi-ball, 3-magnet.
 */
export default function BreakoutEditor() {
  const [grid, setGrid] = useState<Grid>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]),
  );
  const [name, setName] = useState("level1");
  const currentType = useRef<Cell>(1);
  const dragging = useRef(false);

  const setCell = (r: number, c: number, t: Cell) => {
    setGrid((g) => {
      const copy = g.map((row) => row.slice()) as Grid;
      copy[r][c] = t;
      return copy;
    });
  };

  const handleDrop = (r: number, c: number) => {
    setCell(r, c, currentType.current);
  };

  const handleMouseDown = (r: number, c: number) => {
    dragging.current = true;
    handleDrop(r, c);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (dragging.current) handleDrop(r, c);
  };

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  const save = () => {
    localStorage.setItem(`${KEY_PREFIX}${name}`, JSON.stringify(grid));
  };

  const load = () => {
    const txt = localStorage.getItem(`${KEY_PREFIX}${name}`);
    if (txt) {
      try {
        const arr = JSON.parse(txt);
        if (Array.isArray(arr)) setGrid(arr as Grid);
      } catch {
        /* ignore */
      }
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
              currentType.current = t as Cell;
            }}
            onClick={() => {
              currentType.current = t as Cell;
            }}
            className={`w-5 h-5 cursor-pointer ${cellClass(t as Cell)}`}
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
      </div>
    </div>
  );
}

