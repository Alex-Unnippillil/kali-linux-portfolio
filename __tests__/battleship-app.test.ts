import BattleshipAI from '../apps/battleship/ai';
import { placeFleet, shoot, FLEET, createBoard } from '../apps/battleship';

test('ship placement places correct number of cells', () => {
  const board = placeFleet(10);
  const total = board.flat().filter((c) => c === 1).length;
  expect(total).toBe(FLEET.reduce((a, b) => a + b, 0));
});

test('shot resolution marks hits and misses', () => {
  const board = createBoard(2, 0);
  board[0][0] = 1; // place ship
  let b = shoot(board, 0, 0);
  expect(b[0][0]).toBe(2); // hit
  b = shoot(b, 1, 1);
  expect(b[1][1]).toBe(3); // miss
});

test('AI targets adjacent to hits', () => {
  const ai = new BattleshipAI(3);
  const board: number[][] = [
    [0, 0, 0],
    [0, 2, 0],
    [0, 0, 0],
  ];
  const shot = ai.nextShot(board as any, 1);
  const options = [
    [1, 0],
    [1, 2],
    [0, 1],
    [2, 1],
  ];
  const match = options.some(([r, c]) => shot.row === r && shot.col === c);
  expect(match).toBe(true);
});
