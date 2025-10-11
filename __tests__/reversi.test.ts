import {
  createBoard,
  computeLegalMoves,
  applyMove,
  evaluateBoard,
  getBookMove,
  getScoreMargin,
} from '../components/apps/reversiLogic';
import { renderHook, act } from '@testing-library/react';
import useLeaderboard from '../components/apps/Games/common/useLeaderboard';

describe('Reversi rules', () => {
  test('generates legal moves correctly and flips pieces', () => {
    const board = createBoard();
    const moves = computeLegalMoves(board, 'B');
    expect(Object.keys(moves).sort()).toEqual(['2-3', '3-2', '4-5', '5-4']);
    const newBoard = applyMove(board, 2, 3, 'B', moves['2-3']);
    expect(newBoard[3][3]).toBe('B');
    expect(newBoard[2][3]).toBe('B');
  });

  test('requires pass when no moves available', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill('W'));
    board[0][1] = 'B';
    board[0][2] = null;
    const blackMoves = computeLegalMoves(board, 'B');
    const whiteMoves = computeLegalMoves(board, 'W');
    expect(Object.keys(blackMoves)).toHaveLength(0);
    expect(Object.keys(whiteMoves)).toHaveLength(1);
  });

  test('evaluation prefers corners', () => {
    const board = createBoard();
    board[0][0] = 'B';
    const withCorner = evaluateBoard(board, 'B');
    board[0][0] = 'W';
    const withoutCorner = evaluateBoard(board, 'B');
    expect(withCorner).toBeGreaterThan(withoutCorner);
  });

  test('opening book provides first response', () => {
    const board = createBoard();
    const moves = computeLegalMoves(board, 'B');
    const after = applyMove(board, 2, 3, 'B', moves['2-3']);
    expect(getBookMove(after, 'W')).toEqual([2, 2]);

    const board2 = createBoard();
    const moves2 = computeLegalMoves(board2, 'B');
    const after2 = applyMove(board2, 4, 5, 'B', moves2['4-5']);
    expect(getBookMove(after2, 'W')).toEqual([5, 5]);
  });

  test('score margin reflects piece differential', () => {
    const board = createBoard();
    const moves = computeLegalMoves(board, 'B');
    const after = applyMove(board, 2, 3, 'B', moves['2-3']);
    expect(getScoreMargin(after)).toBe(3);
    expect(getScoreMargin(after, 'W')).toBe(-3);
  });
});

describe('Reversi persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('leaderboard stores highest winning margins', () => {
    const { result, unmount } = renderHook(() => useLeaderboard('reversi-jest', 3));
    act(() => {
      result.current.addScore('Player', 5);
    });
    act(() => {
      result.current.addScore('Player', 12);
    });
    act(() => {
      result.current.addScore('Player', 8);
    });
    expect(result.current.scores.map((s) => s.score)).toEqual([12, 8, 5]);
    unmount();
    const { result: rerun } = renderHook(() => useLeaderboard('reversi-jest', 3));
    expect(rerun.current.scores[0].score).toBe(12);
    expect(localStorage.getItem('leaderboard:reversi-jest')).toContain('12');
  });
});
