import { solve, type Cell } from './solver';
import type { NonogramPuzzle } from './parser';

self.onmessage = (e: MessageEvent) => {
  const { grid, puzzle } = e.data as { grid: Cell[][]; puzzle: NonogramPuzzle };
  const result = solve(grid, puzzle);
  // result already has shape { grid, contradiction }
  (self as any).postMessage(result);
};
