import { lineToClues, Grid, Clue } from './logic';

export interface Puzzle {
  name: string;
  rows: Clue[];
  cols: Clue[];
  grid: Grid;
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
    const grid: Grid = lines.map((line) =>
      Array.from(line).map((ch) => (ch === '#' ? 1 : 0))
    );
    const rows = grid.map(lineToClues);
    const width = grid[0]?.length || 0;
    const cols: Clue[] = [];
    for (let c = 0; c < width; c++) {
      const col = grid.map((row) => row[c]);
      cols.push(lineToClues(col));
    }
    return { name: `Puzzle ${idx + 1}`, rows, cols, grid };
  });
};

export const loadPack = (name: string, raw: string): PuzzlePack => ({
  name,
  puzzles: parsePack(raw),
});

export default { parsePack, loadPack };
