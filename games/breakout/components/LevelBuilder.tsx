"use client";

import React, { useEffect, useState } from "react";
import {
  Cell,
  COLS,
  Grid,
  GridSchema,
  ROWS,
  decodeGrid,
  encodeGrid,
} from "../schema";

const emptyGrid = (): Grid =>
  Array.from({ length: ROWS }, () => Array(COLS).fill(0) as Cell[]);

const LevelBuilder = () => {
  const [grid, setGrid] = useState<Grid>(emptyGrid());
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lvl = params.get("level");
    if (lvl) {
      const decoded = decodeGrid(lvl);
      if (decoded) {
        setGrid(decoded);
      } else {
        setError("Invalid level in URL");
      }
    }
  }, []);

  const cycleCell = (r: number, c: number) => {
    setError("");
    setGrid((g) => {
      const copy = g.map((row) => [...row]) as Grid;
      copy[r][c] = ((copy[r][c] + 1) % 4) as Cell;
      return copy;
    });
  };

  const share = () => {
    const parsed = GridSchema.safeParse(grid);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(", "));
      return;
    }
    const encoded = encodeGrid(parsed.data);
    const url = `${window.location.origin}${window.location.pathname}?level=${encoded}`;
    navigator.clipboard.writeText(url).catch(() => {
      /* ignore */
    });
    setLink(url);
    setError("");
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
      {error && <div className="text-red-400 text-sm">{error}</div>}
    </div>
  );
};

export default LevelBuilder;

