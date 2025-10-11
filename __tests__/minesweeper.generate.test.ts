import {
  generateBoard,
  generateBoardWith3BV,
} from '../games/minesweeper/generator';
import { serializeBoard, deserializeBoard } from '../games/minesweeper/save';

describe('minesweeper board generation', () => {
  it('produces deterministic boards and 3BV from seed', () => {
    const seed = 12345;
    const { board, bv } = generateBoardWith3BV(seed);
    expect(bv).toBe(12);
    const board2 = generateBoard(seed);
    expect(board2).toEqual(board);
  });

  it('honors safe start area regardless of difficulty', () => {
    const seed = 98765;
    const startX = 3;
    const startY = 4;
    const board = generateBoard(seed, {
      size: 16,
      mines: 40,
      startX,
      startY,
    });
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const x = startX + dx;
        const y = startY + dy;
        expect(board[x][y].mine).toBe(false);
      }
    }
  });

  it('serializes and deserializes board state', () => {
    const seed = 54321;
    const board = generateBoard(seed, { size: 12, mines: 24 });
    const serialized = serializeBoard(board);
    const restored = deserializeBoard(serialized);
    expect(restored).toEqual(board);
  });
});
