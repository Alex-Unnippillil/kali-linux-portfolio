import { Board, moveLeft, addRandomTile } from '../apps/games/_2048/logic';
import { reset } from '../apps/games/rng';

describe('2048 win condition', () => {
  test('merging 1024 tiles yields 2048', () => {
    const board: Board = [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { board: moved, score } = moveLeft(board);
    expect(moved[0][0]).toBe(2048);
    expect(score).toBe(2048);
  });

  test.each([1, 2, 3, 4, 5])('random tiles deterministic (seed %d)', (seed) => {
    reset(seed.toString());
    const board: Board = Array.from({ length: 4 }, () => Array(4).fill(0));
    addRandomTile(board);
    addRandomTile(board);
    const tiles = board.flat().filter((n) => n !== 0);
    tiles.forEach((v) => expect([2, 4]).toContain(v));
  });
});
