import { checkWinner3D } from '../components/apps/tictactoe-3d';

describe('3D tic tac toe', () => {
  it('detects vertical wins', () => {
    const board = Array(64).fill(null);
    board[0] = board[16] = board[32] = board[48] = 'X';
    expect(checkWinner3D(board).winner).toBe('X');
  });
});
