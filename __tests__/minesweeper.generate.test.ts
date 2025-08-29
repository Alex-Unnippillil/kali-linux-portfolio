import { generateBoard, generateBoardWith3BV } from '../games/minesweeper/generator';

describe('generateBoard', () => {
  it('produces deterministic boards and 3BV from seed', () => {
    const seed = 12345;
    const { board, bv } = generateBoardWith3BV(seed);
    expect(bv).toBe(12);
    const board2 = generateBoard(seed);
    expect(board2).toEqual(board);
  });
});
