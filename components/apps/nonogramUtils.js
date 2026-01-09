import {
  analyzeLine,
  autoFill,
  generateLinePatterns,
  getPossibleLineSolutions,
  gridToClues,
  isSolved,
  lineToClues,
  propagate,
} from '../../apps/games/nonogram/logic';
import { findLogicalHint } from '../../apps/games/nonogram/hints';

export const autoFillLines = (grid, rows, cols) => propagate(grid, rows, cols).grid;

export const findHint = (rows, cols, grid) => findLogicalHint(rows, cols, grid);

export const validateSolution = (grid, rows, cols) => isSolved(grid, rows, cols);

export const puzzles = [
  {
    name: 'Full',
    rows: [[5], [5], [5], [5], [5]],
    cols: [[5], [5], [5], [5], [5]],
    grid: [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
    ],
  },
  {
    name: 'Diamond',
    rows: [[1], [3], [5], [3], [1]],
    cols: [[1], [3], [5], [3], [1]],
    grid: [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0],
    ],
  },
  {
    name: 'Border',
    rows: [[5], [1, 1], [1, 1, 1], [1, 1], [5]],
    cols: [[5], [1, 1], [1, 1, 1], [1, 1], [5]],
    grid: [
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 1, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
    ],
  },
];

export const getPuzzleBySeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return puzzles[hash % puzzles.length];
};

export {
  analyzeLine,
  generateLinePatterns,
  getPossibleLineSolutions,
  gridToClues,
  isSolved,
  lineToClues,
  propagate,
};

const nonogramUtils = {
  analyzeLine,
  autoFill,
  autoFillLines,
  findHint,
  generateLinePatterns,
  getPossibleLineSolutions,
  gridToClues,
  isSolved,
  lineToClues,
  propagate,
  validateSolution,
  getPuzzleBySeed,
  puzzles,
};

export default nonogramUtils;
