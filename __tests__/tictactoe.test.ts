import { minimax, checkWinner } from '../components/apps/tictactoe';

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
});

describe('checkWinner', () => {
  it('detects row win', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];
    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 1, 2]);
  });

  it('detects column win', () => {
    const board = ['O', null, null, 'O', null, null, 'O', null, null];
    const result = checkWinner(board);
    expect(result.winner).toBe('O');
    expect(result.line).toEqual([0, 3, 6]);
  });

  it('detects diagonal win', () => {
    const board = ['X', null, null, null, 'X', null, null, null, 'X'];
    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 4, 8]);
  });

  it('detects draws', () => {
    const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    const { winner } = checkWinner(board);
    expect(winner).toBe('draw');
  });
});
