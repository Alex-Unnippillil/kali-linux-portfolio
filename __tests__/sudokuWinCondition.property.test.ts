import { generateSudoku, isValid } from '../apps/games/sudoku';

const isSolved = (board: number[][]): boolean =>
  board.every((row, r) =>
    row.every((val, c) => {
      if (val === 0) return false;
      board[r][c] = 0;
      const ok = isValid(board, r, c, val);
      board[r][c] = val;
      return ok;
    }),
  );

describe('sudoku win condition', () => {
  test('solutions generated from seeds are valid', () => {
    for (let seed = 0; seed < 5; seed++) {
      const { solution } = generateSudoku('easy', seed);
      expect(isSolved(solution)).toBe(true);
    }
  });

  test('altered solution is detected as invalid', () => {
    for (let seed = 0; seed < 5; seed++) {
      const { solution } = generateSudoku('easy', seed);
      const bad = solution.map((row) => row.slice());
      bad[0][0] = (bad[0][0] % 9) + 1;
      expect(isSolved(bad)).toBe(false);
    }
  });
});
