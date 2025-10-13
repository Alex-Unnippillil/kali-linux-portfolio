import {
  DIFFICULTY_LEVELS,
  generateSudoku,
  hasUniqueSolution,
  isValidPlacement,
} from '../apps/sudoku/generator';
import { createCell, toggleCandidate } from '../apps/sudoku/cell';
import { solve } from '../workers/sudokuSolver';

describe('sudoku generator and validator', () => {
  test.each(DIFFICULTY_LEVELS)('generates unique %s puzzle', (difficulty) => {
    const { puzzle, solution } = generateSudoku(difficulty, 1);
    expect(puzzle).toHaveLength(9);
    expect(solution).toHaveLength(9);
    expect(hasUniqueSolution(puzzle)).toBe(true);
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

  test('pencil marks toggle candidates in sorted order', () => {
    const cell = createCell();
    toggleCandidate(cell, 5);
    toggleCandidate(cell, 2);
    toggleCandidate(cell, 8);
    expect(cell.candidates).toEqual([2, 5, 8]);
    toggleCandidate(cell, 5);
    expect(cell.candidates).toEqual([2, 8]);
  });
});
