import {
  createEmptyBoard,
  getBestMove,
  getMoveForDifficulty,
  getWinningCells,
} from '../games/connect-four/solver';

describe('connect four solver', () => {
  it('detects horizontal wins', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[5][1] = 'red';
    board[5][2] = 'red';
    board[5][3] = 'red';

    expect(getWinningCells(board, 'red')).toEqual([
      { r: 5, c: 0 },
      { r: 5, c: 1 },
      { r: 5, c: 2 },
      { r: 5, c: 3 },
    ]);
  });

  it('detects mixed-stack diagonal wins', () => {
    const board = createEmptyBoard();
    board[5][0] = 'yellow';
    board[4][0] = 'red';
    board[5][1] = 'yellow';
    board[4][1] = 'yellow';
    board[3][1] = 'red';
    board[5][2] = 'yellow';
    board[4][2] = 'yellow';
    board[3][2] = 'yellow';
    board[2][2] = 'red';
    board[5][3] = 'yellow';
    board[4][3] = 'yellow';
    board[3][3] = 'yellow';
    board[2][3] = 'yellow';
    board[1][3] = 'red';

    expect(getWinningCells(board, 'red')).toEqual([
      { r: 1, c: 3 },
      { r: 2, c: 2 },
      { r: 3, c: 1 },
      { r: 4, c: 0 },
    ]);
  });

  it('picks immediate wins and blocks for easy mode', () => {
    const winBoard = createEmptyBoard();
    winBoard[5][0] = 'red';
    winBoard[5][1] = 'red';
    winBoard[5][2] = 'red';
    expect(getMoveForDifficulty(winBoard, 'red', 'easy', { random: () => 0 }).column).toBe(3);

    const blockBoard = createEmptyBoard();
    blockBoard[5][0] = 'yellow';
    blockBoard[5][1] = 'yellow';
    blockBoard[5][2] = 'yellow';
    expect(getMoveForDifficulty(blockBoard, 'red', 'easy', { random: () => 0 }).column).toBe(3);
  });

  it('returns deterministic normal and hard moves for fixed board', () => {
    const board = createEmptyBoard();
    board[5][3] = 'red';
    board[4][3] = 'yellow';
    board[5][2] = 'red';

    const normal = getMoveForDifficulty(board, 'red', 'normal');
    const hard = getMoveForDifficulty(board, 'red', 'hard', { hardTimeMs: 200 });

    expect(normal.column).toBe(hard.column);
    expect(Number.isFinite(normal.column)).toBe(true);
  });

  it('blocks an opponent immediate win with minimax directly', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[5][1] = 'red';
    board[5][2] = 'red';

    const { column } = getBestMove(board, 4, 'yellow');
    expect(column).toBe(3);
  });
});
