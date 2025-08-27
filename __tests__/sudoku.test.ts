import { generateSudoku, solveBoard, hasConflict } from '../components/apps/sudoku';

describe('sudoku utilities', () => {
  test('solver completes generated puzzle', () => {
    const { puzzle, solution } = generateSudoku('easy', 1234);
    const board = puzzle.map((row) => row.slice());
    const solved = solveBoard(board);
    expect(solved).toBe(true);
    expect(board).toEqual(solution);
  });

  test('hasConflict detects duplicates', () => {
    const board = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [2, 3, 4, 5, 6, 7, 8, 9, 1],
      [5, 6, 7, 8, 9, 1, 2, 3, 4],
      [8, 9, 1, 2, 3, 4, 5, 6, 7],
      [3, 4, 5, 6, 7, 8, 9, 1, 2],
      [6, 7, 8, 9, 1, 2, 3, 4, 5],
      [9, 1, 2, 3, 4, 5, 6, 7, 8],
    ];
    // introduce a conflict: duplicate 1 in first row
    board[0][1] = 1;
    expect(hasConflict(board, 0, 1, 1)).toBe(true);
    expect(hasConflict(board, 1, 1, 5)).toBe(false);
  });
});
