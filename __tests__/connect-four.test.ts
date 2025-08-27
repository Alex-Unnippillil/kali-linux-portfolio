import { performance } from 'perf_hooks';
import { createEmptyBoard, checkWinner, minimax } from '../components/apps/connect-four';

describe('connect four logic', () => {
  it('detects diagonal wins', () => {
    const board = createEmptyBoard();
    board[5][0] = 'red';
    board[4][1] = 'red';
    board[3][2] = 'red';
    board[2][3] = 'red';
    const win1 = checkWinner(board, 'red');
    expect(win1).toEqual([
      { r: 2, c: 3 },
      { r: 3, c: 2 },
      { r: 4, c: 1 },
      { r: 5, c: 0 },
    ]);

    const board2 = createEmptyBoard();
    board2[2][0] = 'yellow';
    board2[3][1] = 'yellow';
    board2[4][2] = 'yellow';
    board2[5][3] = 'yellow';
    const win2 = checkWinner(board2, 'yellow');
    expect(win2).toEqual([
      { r: 2, c: 0 },
      { r: 3, c: 1 },
      { r: 4, c: 2 },
      { r: 5, c: 3 },
    ]);
  });

  it('AI depth affects response time', () => {
    const board = createEmptyBoard();
    const start1 = performance.now();
    minimax(board, 1, -Infinity, Infinity, true);
    const time1 = performance.now() - start1;

    const start3 = performance.now();
    minimax(board, 3, -Infinity, Infinity, true);
    const time3 = performance.now() - start3;

    expect(time3).toBeGreaterThan(time1);
  });
});
