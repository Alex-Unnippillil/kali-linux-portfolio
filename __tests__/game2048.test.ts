import { slide, moveLeft, addRandomTile, Board, step } from '../apps/games/_2048/logic';
import { reset, serialize } from '../apps/games/rng';

describe('2048 logic', () => {
  it('slides and merges without double merge', () => {
    expect(slide([2, 2, 2, 2]).row).toEqual([4, 4, 0, 0]);
    expect(slide([2, 2, 4, 4]).row).toEqual([4, 8, 0, 0]);
    expect(slide([2, 2, 4, 4]).score).toBe(12);
  });

  it('moves left across the board', () => {
    const board: Board = [[2, 0, 2, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    expect(moveLeft(board).board).toEqual([[4, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  });

  it('step reports deterministic transitions and no-op correctly', () => {
    const board: Board = [[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    reset('transitions');
    const moved = step(board, 'ArrowLeft');
    expect(moved.changed).toBe(true);
    expect(moved.merges).toHaveLength(1);
    expect(moved.merges[0].to).toEqual({ r: 0, c: 0 });
    expect(moved.movedTiles.some((t) => t.from.r === 0 && t.from.c === 1 && t.to.c === 0)).toBe(true);
    expect(moved.spawns).toHaveLength(1);

    const noOp = step([[2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], 'ArrowLeft');
    expect(noOp.changed).toBe(false);
    expect(noOp.spawns).toEqual([]);
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
