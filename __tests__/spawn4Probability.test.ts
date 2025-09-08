import { addRandomTile, mulberry32 } from '../apps/2048';

test('higher probability spawns more 4 tiles', () => {
  const trials = 500;
  const board = [[0]];

  const randLow = mulberry32(123);
  let low = 0;
  for (let i = 0; i < trials; i += 1) {
    board[0][0] = 0;
    addRandomTile(board, randLow, 0.1);
    if (board[0][0] === 4) low += 1;
  }

  const randHigh = mulberry32(123);
  let high = 0;
  for (let i = 0; i < trials; i += 1) {
    board[0][0] = 0;
    addRandomTile(board, randHigh, 0.9);
    if (board[0][0] === 4) high += 1;
  }

  expect(high).toBeGreaterThan(low);
});
