import { generateSudoku, SIZE } from '../apps/games/sudoku';
import { solve } from '../workers/sudokuSolver';

describe('sudoku win condition', () => {
  const seeds = [0, 1, 2, 3, 4];

  test.each(seeds)('puzzle solvable and unique (seed %d)', (seed) => {
    const { puzzle, solution } = generateSudoku('easy', seed);
    const solved = solve(puzzle.map((r) => r.slice())).solution;
    expect(solved).toEqual(solution);

    for (let i = 0; i < SIZE; i++) {
      const row = new Set(solution[i]);
      const col = new Set(solution.map((r) => r[i]));
      expect(row.size).toBe(SIZE);
      expect(col.size).toBe(SIZE);
    }
  });
});
