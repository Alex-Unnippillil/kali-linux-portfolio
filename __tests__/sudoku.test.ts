import { generateSudoku, isValidPlacement } from '../apps/games/sudoku';
import { solve } from '../workers/sudokuSolver.mts';

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
});
