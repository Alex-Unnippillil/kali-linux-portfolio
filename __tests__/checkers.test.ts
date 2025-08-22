import { createConfig, createBoard } from '../apps/checkers/engine';

test('international board is 10x10', () => {
  const config = createConfig('international');
  const board = createBoard(config);
  expect(board.length).toBe(10);
  expect(board[0].length).toBe(10);
});

test('giveaway variant sets flag', () => {
  const config = createConfig('giveaway');
  expect(config.giveaway).toBe(true);
});
