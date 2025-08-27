import {
  validateSolution,
  findHint,
  getPuzzleBySeed,
  generateLinePatterns,
  lineToClues,
  puzzles,
} from '../components/apps/nonogramUtils';
import { solveNonogram } from '../components/apps/nonogram';

describe('nonogram utilities', () => {
  test('validateSolution confirms grid matches clues', () => {
    const { rows, cols } = getPuzzleBySeed('0');
    const solved = Array(rows.length)
      .fill(null)
      .map(() => Array(cols.length).fill(1));
    expect(validateSolution(solved, rows, cols)).toBe(true);
    const unsolved = solved.map((row) => row.slice());
    unsolved[0][0] = 0;
    expect(validateSolution(unsolved, rows, cols)).toBe(false);
  });

  test('hint fills only logical squares', () => {
    const { rows, cols } = getPuzzleBySeed('0');
    const grid = Array(rows.length)
      .fill(null)
      .map(() => Array(cols.length).fill(0));
    const hint = findHint(rows, cols, grid);
    expect(hint).not.toBeNull();
    if (!hint) return;
    const { i, j } = hint;
    // compute all solutions and ensure cell forced
    const rowPatterns = rows.map((clue) => generateLinePatterns(clue, cols.length));
    const g = Array(rows.length)
      .fill(null)
      .map(() => Array(cols.length).fill(0));
    const solutions: number[][][] = [];
    const backtrack = (r: number) => {
      if (r === rows.length) {
        const colsValid = cols.every(
          (clue, cIdx) =>
            JSON.stringify(lineToClues(g.map((row) => row[cIdx]))) ===
            JSON.stringify(clue)
        );
        if (colsValid) solutions.push(g.map((row) => row.slice()));
        return;
      }
      rowPatterns[r].forEach((pattern) => {
        g[r] = pattern;
        backtrack(r + 1);
      });
    };
    backtrack(0);
    expect(solutions.length).toBeGreaterThan(0);
    solutions.forEach((sol) => expect(sol[i][j]).toBe(1));
  });

  test('daily seed deterministic', () => {
    const a = getPuzzleBySeed('2024-01-01');
    const b = getPuzzleBySeed('2024-01-01');
    expect(a).toEqual(b);
  });

  test('standard puzzles solve without guesses', () => {
    puzzles.forEach(({ rows, cols }) => {
      const res = solveNonogram(rows, cols);
      expect(res).not.toBeNull();
      if (!res) return;
      expect(res.usedGuess).toBe(false);
      expect(validateSolution(res.grid, rows, cols)).toBe(true);
    });
  });
});
