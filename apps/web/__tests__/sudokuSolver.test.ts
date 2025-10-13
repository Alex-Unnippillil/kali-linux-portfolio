import { solve, ratePuzzle, getHint } from '../workers/sudokuSolver';

const puzzle: number[][] = [
  [0, 0, 3, 0, 2, 0, 6, 0, 0],
  [9, 0, 0, 3, 0, 5, 0, 0, 1],
  [0, 0, 1, 8, 0, 6, 4, 0, 0],
  [0, 0, 8, 1, 0, 2, 9, 0, 0],
  [7, 0, 0, 0, 0, 0, 0, 0, 8],
  [0, 0, 6, 7, 0, 8, 2, 0, 0],
  [0, 0, 2, 6, 0, 9, 5, 0, 0],
  [8, 0, 0, 2, 0, 3, 0, 0, 9],
  [0, 0, 5, 0, 1, 0, 3, 0, 0],
];

const solution = '483921657967345821251876493548132976729564138136798245372689514814253769695417382';

describe('sudokuSolver', () => {
  test('solves puzzle', () => {
    const { solution: solved } = solve(puzzle);
    expect(solved.flat().join('')).toBe(solution);
  });

  test('rates puzzle and provides steps', () => {
    const { difficulty, steps } = ratePuzzle(puzzle);
    expect(['easy', 'medium', 'hard']).toContain(difficulty);
    expect(steps.length).toBeGreaterThan(0);
  });

  test('provides a hint', () => {
    const hint = getHint(puzzle);
    expect(hint).not.toBeNull();
    if (hint) {
      if ('value' in hint) {
        expect(hint.value).toBeGreaterThan(0);
      } else {
        expect(hint.values.length).toBe(2);
      }
    }
  });
});
