import type { Grid } from './logic';

export interface Hint {
  i: number;
  j: number;
  value: 1;
}

// Reveal a random correct filled cell from the solution that is not yet filled in the grid
export const revealRandomCell = (grid: Grid, solution: Grid): Hint | null => {
  const candidates: { i: number; j: number }[] = [];
  for (let i = 0; i < solution.length; i++) {
    for (let j = 0; j < solution[i].length; j++) {
      if (solution[i][j] === 1 && grid[i][j] !== 1) {
        candidates.push({ i, j });
      }
    }
  }
  if (!candidates.length) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { i: pick.i, j: pick.j, value: 1 };
};

// Hint system that limits the number of hints available per puzzle
export const createHintSystem = (maxHints: number) => {
  let used = 0;
  return {
    useHint(grid: Grid, solution: Grid): Hint | null {
      if (used >= maxHints) return null;
      const hint = revealRandomCell(grid, solution);
      if (hint) used += 1;
      return hint;
    },
    remaining(): number {
      return maxHints - used;
    },
  };
};

const hintsApi = { revealRandomCell, createHintSystem };
export default hintsApi;
