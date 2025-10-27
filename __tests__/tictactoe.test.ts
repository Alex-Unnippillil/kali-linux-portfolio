import { minimax, checkWinner, createBoard } from '../apps/games/tictactoe/logic';
import {
  applyResult,
  loadStats,
  saveStats,
  STATS_STORAGE_KEY,
  createVariantKey,
  computeGlobalBestStreak,
} from '../apps/games/tictactoe/storage';

describe('tic tac toe AI', () => {
  const simulate = (firstMove: number) => {
    let board = Array(9).fill(null);
    board[firstMove] = 'X';
    while (true) {
      let result = checkWinner(board, 3).winner;
      if (result) return result;
      const aiMove = minimax(board, 'O', 3).index;
      board[aiMove] = 'O';
      result = checkWinner(board, 3).winner;
      if (result) return result;
      const playerMove = minimax(board, 'X', 3).index;
      board[playerMove] = 'X';
    }
  };

  it('AI never loses on hard mode', () => {
    for (let i = 0; i < 9; i++) {
      const result = simulate(i);
      expect(result).not.toBe('X');
    }
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

describe('tic tac toe persistence', () => {
  const variant = createVariantKey('classic', 3);

  beforeEach(() => {
    localStorage.clear();
  });

  it('persists wins/losses/draws for a variant', () => {
    let stats = loadStats();
    expect(stats[variant]).toBeUndefined();
    stats = applyResult(stats, variant, 'win');
    saveStats(stats);
    const stored = localStorage.getItem(STATS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored || '{}');
    expect(parsed[variant].wins).toBe(1);
    const reloaded = loadStats();
    expect(reloaded[variant].wins).toBe(1);
    expect(reloaded[variant].streak).toBe(1);
  });

  it('resets streak on loss while tracking best streak', () => {
    let stats = loadStats();
    stats = applyResult(stats, variant, 'win');
    stats = applyResult(stats, variant, 'win');
    stats = applyResult(stats, variant, 'loss');
    expect(stats[variant].streak).toBe(0);
    expect(stats[variant].bestStreak).toBe(2);
    expect(computeGlobalBestStreak(stats)).toBe(2);
  });

  it('migrates legacy storage schema', () => {
    localStorage.setItem(
      'tictactoeStats',
      JSON.stringify({ [variant]: { wins: 3, losses: 1, draws: 2 } }),
    );
    const stats = loadStats();
    expect(stats[variant].wins).toBe(3);
    expect(stats[variant].losses).toBe(1);
    expect(stats[variant].draws).toBe(2);
    expect(stats[variant].bestStreak).toBe(3);
    expect(localStorage.getItem(STATS_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem('tictactoeStats')).toBeNull();
  });
});
