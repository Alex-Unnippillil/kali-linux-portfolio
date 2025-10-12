import {
  generateSudoku,
  isValidPlacement,
  HOLES_BY_DIFFICULTY,
} from '../apps/games/sudoku';
import { solve } from '../workers/sudokuSolver';
import { recordBestTime, getBestTime } from '../apps/games/sudoku/stats';

describe('sudoku generator and validator', () => {
  test('generates solvable puzzle', () => {
    const { puzzle, solution } = generateSudoku('easy', 1);
    expect(puzzle).toHaveLength(9);
    expect(solution).toHaveLength(9);
    const solved = solve(puzzle.map((r) => r.slice())).solution;
    expect(solved).toEqual(solution);
  });

  test('isValidPlacement detects invalid moves', () => {
    const { puzzle, solution } = generateSudoku('easy', 2);
    const board = puzzle.map((r) => r.slice());
    let row = 0;
    let col = 0;
    outer: for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          row = r;
          col = c;
          break outer;
        }
      }
    }
    const correct = solution[row][col];
    expect(isValidPlacement(board, row, col, correct)).toBe(true);
    const wrong = (correct % 9) + 1;
    expect(isValidPlacement(board, row, col, wrong)).toBe(false);
  });

  test('respects hole counts per difficulty', () => {
    (['easy', 'medium', 'hard'] as const).forEach((difficulty) => {
      const { puzzle } = generateSudoku(difficulty, 7);
      const blanks = puzzle.flat().filter((cell) => cell === 0).length;
      expect(blanks).toBeGreaterThanOrEqual(HOLES_BY_DIFFICULTY[difficulty] - 1);
      expect(blanks).toBeLessThanOrEqual(HOLES_BY_DIFFICULTY[difficulty] + 1);
    });
  });

  test('returns deterministic puzzles for a given seed', () => {
    const first = generateSudoku('medium', 42);
    const second = generateSudoku('medium', 42);
    expect(first.puzzle).toEqual(second.puzzle);
    expect(first.solution).toEqual(second.solution);
  });
});

describe('sudoku best time persistence helpers', () => {
  test('records only improved times', () => {
    let record = {} as Record<string, number>;
    record = recordBestTime(record, 'daily', 'easy', 120);
    expect(getBestTime(record, 'daily', 'easy')).toBe(120);
    record = recordBestTime(record, 'daily', 'easy', 150);
    expect(getBestTime(record, 'daily', 'easy')).toBe(120);
    record = recordBestTime(record, 'daily', 'easy', 90);
    expect(getBestTime(record, 'daily', 'easy')).toBe(90);
  });

  test('ignores invalid times', () => {
    const record = recordBestTime({}, 'random', 'hard', -5);
    expect(getBestTime(record, 'random', 'hard')).toBeUndefined();
  });
});
