import { minimax, checkWinner } from '@components/apps/tictactoe';

describe('tic tac toe AI', () => {
  it('evaluates winning moves', () => {
    const board = ['X', 'X', null, null, 'O', null, null, null, null];
    const { index, score } = minimax(board, 'X');
    expect(index).toBeDefined();
    expect(score).toBe(1);
  });

  it('detects draws correctly', () => {
    const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    const { winner } = checkWinner(board);
    expect(winner).toBe('draw');
  });
});

