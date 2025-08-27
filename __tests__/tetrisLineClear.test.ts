import { clearLines, WIDTH, HEIGHT } from '../components/apps/tetris';

describe('tetris line clearing', () => {
  it('removes filled rows and returns cleared count', () => {
    const board = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(0));
    board[HEIGHT - 1] = Array(WIDTH).fill(1);
    const { board: newBoard, cleared } = clearLines(board);
    expect(cleared).toBe(1);
    expect(newBoard[HEIGHT - 1].every((c) => c === 0)).toBe(true);
  });
});
