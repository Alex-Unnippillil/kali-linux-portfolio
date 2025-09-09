"use client";

// Simple utility component used for quickly sketching small Breakout
// levels. It encodes the grid into a sharable URL so other players can
// try the design in their own game.
import React, { useEffect, useState } from "react";

const ROWS = 5;
const COLS = 10;

type Cell = 0 | 1 | 2 | 3;
type Grid = Cell[][];

const emptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);

const encodeGrid = (grid: Grid) => {
  return btoa(JSON.stringify(grid));
};

const decodeGrid = (str: string): Grid | null => {
  try {
    const arr = JSON.parse(atob(str));
    if (Array.isArray(arr)) return arr as Grid;
  } catch {
    /* ignore */
  }
  return null;
};

const LevelBuilder = () => {
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [link, setLink] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lvl = params.get("level");
    if (lvl) {
      const decoded = decodeGrid(lvl);
      if (decoded) setGrid(decoded);
    }
  }, []);

  const cycleCell = (r: number, c: number) => {
    setGrid((g) => {
      const copy = g.map((row) => [...row]) as Grid;
      copy[r][c] = ((copy[r][c] + 1) % 4) as Cell;
      return copy;
    });
  };

  const share = () => {
    const encoded = encodeGrid(grid);
    const url = `${window.location.origin}${window.location.pathname}?level=${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {
      /* ignore */
    });
    setLink(url);
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
                  ? "bg-gray-800"
                  : cell === 1
                    ? "bg-blue-500"
                    : cell === 2
                      ? "bg-green-500"
                      : "bg-red-500"
              }
              style={{ width: 20, height: 10 }}
            />
          )),
        )}
      </div>
      <div className="flex space-x-2 items-center">
        <button
          type="button"
          onClick={share}
          className="px-2 py-1 bg-gray-700 rounded"
        >
          Share
        </button>
        {link && (
          <input
            className="text-black px-1 flex-1"
            value={link}
            readOnly
          />
        )}
      </div>
    </div>
  );
};

export default LevelBuilder;

