import {
  createEmptyBoard,
  getBestMove,
  getWinningCells,
} from '../games/connect-four/solver';

describe('connect four solver', () => {
  it('detects horizontal wins', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[5][1] = 'red';
    board[5][2] = 'red';
    board[5][3] = 'red';

    const win = getWinningCells(board, 'red');
    expect(win).toEqual([
      { r: 5, c: 0 },
      { r: 5, c: 1 },
      { r: 5, c: 2 },
      { r: 5, c: 3 },
    ]);
  });

  it('detects vertical wins', () => {
    const board = createEmptyBoard();
    board[5][3] = 'yellow';
    board[4][3] = 'yellow';
    board[3][3] = 'yellow';
    board[2][3] = 'yellow';

    const win = getWinningCells(board, 'yellow');
    expect(win).toEqual([
      { r: 2, c: 3 },
      { r: 3, c: 3 },
      { r: 4, c: 3 },
      { r: 5, c: 3 },
    ]);
  });

  it('detects diagonal wins', () => {
    const board = createEmptyBoard();
    board[2][0] = 'red';
    board[3][1] = 'red';
    board[4][2] = 'red';
    board[5][3] = 'red';

    const win = getWinningCells(board, 'red');
    expect(win).toEqual([
      { r: 2, c: 0 },
      { r: 3, c: 1 },
      { r: 4, c: 2 },
      { r: 5, c: 3 },
    ]);
  });

  it('detects reverse diagonal wins', () => {
    const board = createEmptyBoard();
    board[2][3] = 'yellow';
    board[3][2] = 'yellow';
    board[4][1] = 'yellow';
    board[5][0] = 'yellow';

    const win = getWinningCells(board, 'yellow');
    expect(win).toEqual([
      { r: 2, c: 3 },
      { r: 3, c: 2 },
      { r: 4, c: 1 },
      { r: 5, c: 0 },
    ]);
  });

  it('picks an immediate winning move', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[5][1] = 'red';
    board[5][2] = 'red';

    const { column } = getBestMove(board, 4, 'red');
    expect(column).toBe(3);
  });

  it('blocks an opponent immediate win', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[5][1] = 'red';
    board[5][2] = 'red';

    const { column } = getBestMove(board, 4, 'yellow');
    expect(column).toBe(3);
  });

  it('avoids losing next turn when possible', () => {
    const board = createEmptyBoard();
    board[5][0] = 'yellow';
    board[5][1] = 'yellow';
    board[5][2] = 'yellow';

    const { column } = getBestMove(board, 4, 'red');
    expect(column).toBe(3);
  });
});
