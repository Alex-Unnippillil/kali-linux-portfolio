import type { Clue, Grid } from './logic';
import { analyzeLine } from './logic';

export interface Hint {
  i: number;
  j: number;
  value: 1 | -1;
}

// Find a forced move derived from current constraints
export const findLogicalHint = (rows: Clue[], cols: Clue[], grid: Grid): Hint | null => {
  // Check rows for forced cells
  for (let i = 0; i < rows.length; i++) {
    const res = analyzeLine(rows[i], grid[i]);
    for (let j = 0; j < res.forced.length; j++) {
      const val = res.forced[j];
      if (val !== null && grid[i][j] === 0) return { i, j, value: val };
    }
  }

  // Check columns for forced cells
  for (let j = 0; j < cols.length; j++) {
    const col = grid.map((row) => row[j]);
    const res = analyzeLine(cols[j], col);
    for (let i = 0; i < res.forced.length; i++) {
      const val = res.forced[i];
      if (val !== null && grid[i][j] === 0) return { i, j, value: val };
    }
  }

  return null;
};

// Hint system that limits the number of hints available per puzzle
export const createHintSystem = (maxHints: number) => {
  let used = 0;
  return {
    useHint(grid: Grid, rows: Clue[], cols: Clue[]): Hint | null {
      if (used >= maxHints) return null;
      const hint = findLogicalHint(rows, cols, grid);
      if (hint) used += 1;
      return hint;
    },
    remaining(): number {
      return maxHints - used;
    },
  };
};

const hintsApi = { findLogicalHint, createHintSystem };
export default hintsApi;
