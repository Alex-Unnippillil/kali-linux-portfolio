"use client";

import React, { useState, useEffect } from "react";
import type { Clue, Grid } from "../../../apps/games/nonogram/logic";
import { lineToClues } from "../../../apps/games/nonogram/logic";
import Board from "./Board";

export interface ParsedPuzzle {
  grid: Grid;
  rows: Clue[];
  cols: Clue[];
}

// Validate that the given grid matches the supplied clues.
export const validatePuzzle = (grid: Grid, rows: Clue[], cols: Clue[]) => {
  const rowsValid = grid.every(
    (row, i) => JSON.stringify(lineToClues(row)) === JSON.stringify(rows[i])
  );
  const colsValid = cols.every((clue, j) => {
    const column = grid.map((r) => r[j]);
    return JSON.stringify(lineToClues(column)) === JSON.stringify(clue);
  });
  return rowsValid && colsValid;
};

// Parse a monochrome PNG into a puzzle representation. Works in both
// browser and Node environments. In Node it relies on `pngjs`.
export async function parseMonochromePng(
  input: File | ArrayBuffer
): Promise<ParsedPuzzle> {
  const buffer = input instanceof ArrayBuffer ? input : await input.arrayBuffer();

  // Browser implementation using Canvas APIs
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const blob = new Blob([buffer], { type: "image/png" });
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return dataToPuzzle(data, bitmap.width, bitmap.height);
  }

  // Node implementation using pngjs
  const { PNG } = await import("pngjs");
  const png = PNG.sync.read(Buffer.from(buffer));
  return dataToPuzzle(png.data, png.width, png.height);
}

// Convert raw RGBA data into grid/clues
type ByteArray = Uint8Array | Uint8ClampedArray;
const dataToPuzzle = (data: ByteArray, width: number, height: number) => {
  // normalize (zero-copy) so indexing works the same for both cases
  const bytes =
    data instanceof Uint8ClampedArray
      ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      : data;

  const grid: Grid = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      // treat non-transparent dark pixels as filled
      const val = a > 127 && (r + g + b) / 3 < 128 ? 1 : 0;
      row.push(val);
    }
    grid.push(row as Grid[number]);
  }
  const rows = grid.map(lineToClues);
  const cols: Clue[] = [];
  for (let x = 0; x < width; x++) {
    const column = grid.map((row) => row[x]);
    cols.push(lineToClues(column));
  }
  return { grid, rows, cols };
};

const PngImport: React.FC = () => {
  const [puzzle, setPuzzle] = useState<ParsedPuzzle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [grid, setGrid] = useState<Grid>([]);

  useEffect(() => {
    if (puzzle) {
      const h = puzzle.rows.length;
      const w = puzzle.cols.length;
      setGrid(Array.from({ length: h }, () => Array(w).fill(0)) as Grid);
    }
  }, [puzzle]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const parsed = await parseMonochromePng(file);
      if (!validatePuzzle(parsed.grid, parsed.rows, parsed.cols)) {
        throw new Error("Invalid puzzle");
      }
      setPuzzle(parsed);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to parse PNG");
      setPuzzle(null);
    }
  };

  return (
    <div>
      <input type="file" accept="image/png" onChange={onFile} />
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {puzzle && (
        <div className="mt-4">
          <Board
            rows={puzzle.rows}
            cols={puzzle.cols}
            solution={puzzle.grid}
            grid={grid}
            onChange={setGrid}
          />
        </div>
      )}
    </div>
  );
};

export default PngImport;
