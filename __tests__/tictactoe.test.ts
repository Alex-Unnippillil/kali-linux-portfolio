import { minimax, checkWinner } from '@components/apps/tictactoe';

describe('tic tac toe AI', () => {
  const simulate = (firstMove: number) => {
    let board: (string | null)[] = Array(9).fill(null);
    board[firstMove] = 'X'; // human plays X
    while (true) {
      let result = checkWinner(board).winner;
      if (result) return result;
      const aiMove = minimax(board, 'O').index;
      board[aiMove] = 'O';
      result = checkWinner(board).winner;
      if (result) return result;
      const playerMove = minimax(board, 'X').index;
      board[playerMove] = 'X';
    }
  };

  it('AI never loses on hard mode', () => {
    for (let i = 0; i < 9; i++) {
      const result = simulate(i);
      expect(result).not.toBe('X'); // AI is O, losing means X wins
    }
  });

  it('detects draws correctly', () => {
    const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    const { winner } = checkWinner(board);
    expect(winner).toBe('draw');
  });
});
