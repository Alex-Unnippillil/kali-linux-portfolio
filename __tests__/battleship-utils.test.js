import { canPlaceShip, isGameOver } from '../components/apps/battleship/utils';
import { BOARD_SIZE } from '../components/apps/battleship/ai';

test('canPlaceShip rejects overlaps', () => {
  const ships = [{ id: 0, cells: [0, 1] }];
  const res = canPlaceShip(ships, 0, 0, 0, 2, 1);
  expect(res).toBeNull();
});

test('isGameOver detects when all ships sunk', () => {
  const board = Array(BOARD_SIZE * BOARD_SIZE).fill(null);
  expect(isGameOver(board)).toBe(true);
  board[0] = 'ship';
  expect(isGameOver(board)).toBe(false);
  board[0] = 'hit';
  expect(isGameOver(board)).toBe(true);
});
