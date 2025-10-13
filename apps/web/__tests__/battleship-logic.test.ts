import { fireShots, CellState } from '../apps/games/battleship/logic';

test('fireShots marks hits and misses for multiple targets', () => {
  const board: CellState[] = Array(4).fill(null);
  board[1] = 'ship';
  board[3] = 'ship';
  const { board: updated, hits, misses } = fireShots(board, [0, 1, 2, 3]);
  expect(updated).toEqual(['miss', 'hit', 'miss', 'hit']);
  expect(hits.sort()).toEqual([1, 3]);
  expect(misses.sort()).toEqual([0, 2]);
});
