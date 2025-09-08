import { addRandomTile, boardsEqual, hasWon, setSize, Board } from '../apps/games/_2048/logic';
import { random, reset } from '../apps/games/rng';

declare const global: any;

const emptyBoard = (): Board => Array.from({ length: 4 }, () => Array(4).fill(0));

describe('2048 deterministic RNG and win detection', () => {
  test('random tile placement is deterministic for seeds', () => {
    const seeds = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    for (const seed of seeds) {
      reset(seed);
      setSize(4);
      const a = emptyBoard();
      addRandomTile(a); addRandomTile(a);
      reset(seed);
      setSize(4);
      const b = emptyBoard();
      addRandomTile(b); addRandomTile(b);
      expect(boardsEqual(a, b)).toBe(true);
    }
  });

  test('hasWon matches presence of >=2048 tile', () => {
    for (let seed = 0; seed < 10; seed++) {
      reset(String(seed));
      const board = emptyBoard();
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          const vals = [0,2,4,8,16,32,64,128,256,512,1024,2048,4096];
          board[r][c] = vals[Math.floor(random() * vals.length)];
        }
      }
      const expected = board.flat().some(v => v >= 2048);
      expect(hasWon(board)).toBe(expected);
    }
  });
});
