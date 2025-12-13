import {
  applyMove,
  checkWinner,
  chooseAiMove,
  createBoard,
  getLegalMoves,
} from '../apps/games/tictactoe/logic';

const playPerfectGame = (firstMove: number) => {
  let board = Array(9).fill(null);
  const history: { player: 'X' | 'O'; move: number }[] = [];
  board[firstMove] = 'X';
  history.push({ player: 'X', move: firstMove });
  while (true) {
    let result = checkWinner(board, 3).winner;
    if (result) return { winner: result, history };
    const aiMove = chooseAiMove(board, 'O', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    board = applyMove(board, aiMove, 'O');
    history.push({ player: 'O', move: aiMove });
    result = checkWinner(board, 3).winner;
    if (result) return { winner: result, history };
    const playerMove = chooseAiMove(board, 'X', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    board = applyMove(board, playerMove, 'X');
    history.push({ player: 'X', move: playerMove });
  }
};

describe('tic tac toe AI', () => {
    it('AI never loses on hard mode', () => {
      const failures: number[] = [];
      for (let i = 0; i < 9; i++) {
        const result = playPerfectGame(i);
        if (result.winner === 'X') failures.push(i);
      }
      expect(failures).toEqual([]);
    });

  it('picks center on an empty board', () => {
    const baseBoard = createBoard(3);
    const move = chooseAiMove(baseBoard, 'X', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    expect(move).toBe(4);
  });

  it('responds with center after a corner start', () => {
    const board = createBoard(3);
    board[0] = 'X';
    const move = chooseAiMove(board, 'O', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    expect(move).toBe(4);
  });

  it('avoids completing its own line in misère when possible', () => {
    const board = [
      'X',
      'X',
      null,
      'O',
      'O',
      null,
      null,
      null,
      null,
    ];
    // It is X's turn; placing at index 2 would complete a line and lose.
    const move = chooseAiMove(board, 'X', {
      size: 3,
      mode: 'misere',
      difficulty: 'hard',
      rng: () => 0,
    });
    expect(move).not.toBe(2);
    expect(board[move]).toBeNull();
  });

  it('blocks obvious threats on hard mode', () => {
    const board = ['X', 'X', null, null, 'O', null, null, null, null];
    const move = chooseAiMove(board, 'O', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    expect(move).toBe(2);
  });
});

describe('minimax legality', () => {
  it('only returns legal cells', () => {
    const board = ['X', 'O', 'X', null, null, null, null, null, null];
    const move = chooseAiMove(board, 'O', {
      size: 3,
      mode: 'classic',
      difficulty: 'hard',
      rng: () => 0,
    });
    expect(getLegalMoves(board)).toContain(move);
  });
});

describe('checkWinner', () => {
  it('detects row win 3x3', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];
    const result = checkWinner(board, 3);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 1, 2]);
  });

  it('detects column win 3x3', () => {
    const board = ['O', null, null, 'O', null, null, 'O', null, null];
    const result = checkWinner(board, 3);
    expect(result.winner).toBe('O');
    expect(result.line).toEqual([0, 3, 6]);
  });

  it('detects diagonal win 3x3', () => {
    const board = ['X', null, null, null, 'X', null, null, null, 'X'];
    const result = checkWinner(board, 3);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 4, 8]);
  });

  it('detects draw 3x3', () => {
    const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
    const { winner } = checkWinner(board, 3);
    expect(winner).toBe('draw');
  });

  it('detects row win 4x4', () => {
    const board = Array(16).fill(null);
    board[0] = 'X';
    board[1] = 'X';
    board[2] = 'X';
    board[3] = 'X';
    const result = checkWinner(board, 4);
    expect(result.winner).toBe('X');
    expect(result.line).toEqual([0, 1, 2, 3]);
  });

  it('detects column win 5x5', () => {
    const board = createBoard(5);
    board[0] = 'O';
    board[5] = 'O';
    board[10] = 'O';
    board[15] = 'O';
    board[20] = 'O';
    const result = checkWinner(board, 5);
    expect(result.winner).toBe('O');
    expect(result.line).toEqual([0, 5, 10, 15, 20]);
  });

  it('inverts winner in misère mode', () => {
    const board = ['X', 'X', 'X', null, null, null, null, null, null];
    const result = checkWinner(board, 3, true);
    expect(result.winner).toBe('O');
  });
});
