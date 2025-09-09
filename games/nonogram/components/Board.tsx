"use client";

import React, { useState } from "react";
import type { Clue, Grid } from "../../../apps/games/nonogram/logic";

interface BoardProps {
  rows: Clue[];
  cols: Clue[];
  solution: Grid;
  /** Current state of the puzzle grid. */
  grid: Grid;
  /**
   * Notify parent components when the grid state changes. The provided grid is
   * a deep copy and can be used directly as new state.
   */
  onChange: (grid: Grid) => void;
}

type Cell = -1 | 0 | 1;

const Board: React.FC<BoardProps> = ({
  rows,
  cols,
  solution,
  grid,
  onChange,
}) => {
  const height = rows.length;
  const width = cols.length;
  const [mode, setMode] = useState<"fill" | "cross">("fill");
  const [errorCell, setErrorCell] = useState<{ i: number; j: number } | null>(
    null
  );
  const [zoom, setZoom] = useState(1);

  const toggleCell = (i: number, j: number) => {
    const ng = grid.map((row) => row.slice()) as Grid;
    const current = ng[i][j];
    const next: Cell =
      mode === "fill" ? (current === 1 ? 0 : 1) : current === -1 ? 0 : -1;
    ng[i][j] = next;
    if (
      (next === 1 && solution[i][j] !== 1) ||
      (next === -1 && solution[i][j] === 1)
    ) {
      setErrorCell({ i, j });
      setTimeout(() => setErrorCell(null), 300);
    }
    onChange(ng);
  };

  const total = solution.reduce(
    (acc, row) => acc + row.filter((c) => c === 1).length,
    0
  );
  const done = grid.reduce(
    (acc, row, i) =>
      acc + row.filter((c, j) => c === 1 && solution[i][j] === 1).length,
    0
  );
  const progress = total ? (done / total) * 100 : 0;

  const cellClass = (i: number, j: number, value: Cell) => {
    const base =
      "w-6 h-6 border border-gray-400 text-center align-middle select-none";
    const content =
      value === 1 ? "bg-black" : value === -1 ? "relative bg-white" : "bg-white";
    const cross =
      value === -1
        ? "after:content-['✕'] after:absolute after:inset-0 after:flex after:items-center after:justify-center after:text-gray-500"
        : "";
    const error =
      errorCell && errorCell.i === i && errorCell.j === j
        ? "animate-pulse bg-red-300"
        : "";
    return `${base} ${content} ${cross} ${error}`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 flex-wrap">
        <button
          className={`px-2 py-1 border rounded ${
            mode === "fill" ? "bg-gray-200" : ""
          }`}
          onClick={() => setMode("fill")}
        >
          Fill
        </button>
        <button
          className={`px-2 py-1 border rounded ${
            mode === "cross" ? "bg-gray-200" : ""
          }`}
          onClick={() => setMode("cross")}
        >
          Cross
        </button>
        <label className="flex items-center gap-2">
          <span className="text-sm">Zoom</span>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
          />
        </label>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded">
        <div
          className="bg-green-500 h-2 rounded"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="inline-block overflow-auto"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        <table className="border-collapse">
          <thead>
            <tr>
              <th />
              {cols.map((clue, j) => (
                <th key={j} className="px-1 text-xs text-center">
                  {clue.length ? clue.join(" ") : "0"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((clueRow, i) => (
              <tr key={i}>
                <th className="pr-1 text-xs text-right">
                  {clueRow.length ? clueRow.join(" ") : "0"}
                </th>
                {cols.map((_, j) => (
                  <td
                    key={j}
                    className={cellClass(i, j, grid[i][j] as Cell)}
                    onClick={() => toggleCell(i, j)}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Board;

