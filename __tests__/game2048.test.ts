import { slide, moveLeft, addRandomTile, Board } from '../apps/games/_2048/logic';
import { reset, serialize } from '../apps/games/rng';

describe('2048 logic', () => {
  it('slides and merges', () => {
    expect(slide([2, 0, 2, 0]).row).toEqual([4, 0, 0, 0]);
    expect(slide([2, 2, 2, 0]).row).toEqual([4, 2, 0, 0]);
  });

  it('prevents double merges in a single move', () => {
    expect(slide([2, 2, 2, 2]).row).toEqual([4, 4, 0, 0]);
    expect(slide([4, 4, 4, 4]).row).toEqual([8, 8, 0, 0]);
  });

  it('moves left across the board', () => {
    const board: Board = [
      [2, 0, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    expect(moveLeft(board).board).toEqual([
      [4, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });

  it('tracks merge score and coordinates', () => {
    const board: Board = [
      [2, 2, 4, 4],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const { score, merges } = moveLeft(board);
    expect(score).toBe(12);
    expect(merges).toEqual([
      [0, 0],
      [0, 1],
    ]);
  });

  it('uses seeded RNG for random tiles', () => {
    const board: Board = Array.from({ length: 4 }, () => Array(4).fill(0));
    reset('test');
    addRandomTile(board);
    const state1 = serialize();
    const board1 = board.map((row) => [...row]);
    reset('test');
    const board2: Board = Array.from({ length: 4 }, () => Array(4).fill(0));
    addRandomTile(board2);
    expect(board2).toEqual(board1);
    expect(serialize()).toBe(state1);
  });
});
