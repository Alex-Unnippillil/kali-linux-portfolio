import { fireShots } from '../apps/games/battleship/logic';

describe('fireShots', () => {
  it('ignores repeat or invalid shots and preserves board length', () => {
    const board = Array(100).fill(null);
    board[5] = 'ship';
    const shipCells = new Set([5]);

    const first = fireShots(board, [5, 15, -1, 200], shipCells);
    const second = fireShots(first.board, [5, 15, -1, 200], shipCells);

    expect(first.board.length).toBe(100);
    expect(second.board.length).toBe(100);
    expect(first.hits).toEqual([5]);
    expect(first.misses).toEqual([15]);
    expect(second.hits).toEqual([]);
    expect(second.misses).toEqual([]);
    expect(second.board).toEqual(first.board);
  });
});
