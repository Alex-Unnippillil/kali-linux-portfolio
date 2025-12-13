import { lineToClues, PatternCell, Clue, gridToClues } from './logic';

export interface Puzzle {
  name: string;
  rows: Clue[];
  cols: Clue[];
  grid: PatternCell[][];
}

export interface PuzzlePack {
  name: string;
  puzzles: Puzzle[];
}

// Parse a puzzle pack string into puzzle objects. Puzzles are separated
// by blank lines and use '#' for filled cells and '.' for blanks.
export const parsePack = (raw: string): Puzzle[] => {
  const blocks = raw.trim().split(/\n\s*\n/).filter(Boolean);
  return blocks.map((block, idx) => {
    const lines = block.trim().split(/\n/);
    const grid: PatternCell[][] = lines.map((line) =>
      Array.from(line).map((ch) => (ch === '#' ? 1 : 0)) as PatternCell[]
    );
    const { rows, cols } = gridToClues(grid);
    return { name: `Puzzle ${idx + 1}`, rows, cols, grid };
  });
};

export const loadPack = (name: string, raw: string): PuzzlePack => ({
  name,
  puzzles: parsePack(raw),
});

// Load a puzzle pack from JSON data. The JSON should contain an object with
// a `name` and an array of puzzles where each puzzle has a `name` and `grid`
// represented as an array of strings using `#` for filled cells and `.` for blanks.
export const loadPackFromJSON = (raw: string): PuzzlePack => {
  const data = JSON.parse(raw) as {
    name: string;
    puzzles: { name: string; grid: string[] }[];
  };
  const puzzles: Puzzle[] = data.puzzles.map((p, idx) => {
    const grid: PatternCell[][] = p.grid.map((line) =>
      Array.from(line).map((ch) => (ch === '#' ? 1 : 0)) as PatternCell[]
    );
    const { rows, cols } = gridToClues(grid);
    return { name: p.name || `Puzzle ${idx + 1}`, rows, cols, grid };
  });
  return { name: data.name, puzzles };
};

const packsApi = { parsePack, loadPack, loadPackFromJSON };
export default packsApi;
