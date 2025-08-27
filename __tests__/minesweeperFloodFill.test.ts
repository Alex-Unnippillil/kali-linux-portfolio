import { revealCell, BOARD_SIZE } from '../components/apps/minesweeper';

describe('minesweeper flood fill', () => {
  it('reveals contiguous empty cells', () => {
    const board = Array.from({ length: BOARD_SIZE }, () =>
      Array.from({ length: BOARD_SIZE }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
      }))
    );
    revealCell(board, 0, 0);
    expect(board.flat().every((cell) => cell.revealed)).toBe(true);
  });
});
