import { addRandomTile, Board } from '../apps/games/_2048/logic';
import { random, reset } from '../apps/games/rng';

const hasWon = (board: Board): boolean =>
  board.some((row) => row.some((val) => val >= 2048));

const randomBoard = (seed: string): Board => {
  reset(seed);
  const board: Board = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const idx = Math.floor(random() * 12); // 0 -> empty, 1..11 -> powers of two
      board[r][c] = idx === 0 ? 0 : 2 ** idx;
    }
  }
  return board;
};

describe('2048 win condition', () => {
  test('seeding RNG yields deterministic tile placement', () => {
    for (let seed = 0; seed < 5; seed++) {
      reset(seed.toString());
      const a = addRandomTile(
        Array.from({ length: 4 }, () => Array(4).fill(0)),
      );
      reset(seed.toString());
      const b = addRandomTile(
        Array.from({ length: 4 }, () => Array(4).fill(0)),
      );
      expect(a).toEqual(b);
    }
  });

  test('hasWon matches presence of 2048 tile', () => {
    for (let seed = 0; seed < 20; seed++) {
      const board = randomBoard(seed.toString());
      expect(hasWon(board)).toBe(board.flat().some((v) => v >= 2048));
    }
  });
});
