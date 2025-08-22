import {
  createBoard,
  computeLegalMoves,
  applyMove,
  countPieces,
  bestMove,
} from '../components/apps/reversiLogic';

describe('Reversi rules', () => {
  test('initial legal moves and flipping', () => {
    const board = createBoard();
    const moves = computeLegalMoves(board, 'B');
    expect(Object.keys(moves).sort()).toEqual(['2-3', '3-2', '4-5', '5-4']);
    const newBoard = applyMove(board, 2, 3, 'B', moves['2-3']);
    expect(newBoard[3][3]).toBe('B');
    expect(newBoard[2][3]).toBe('B');
  });

  test('pass when no legal moves', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill('W'));
    board[0][1] = 'B';
    board[0][2] = null;
    const blackMoves = computeLegalMoves(board, 'B');
    const whiteMoves = computeLegalMoves(board, 'W');
    expect(Object.keys(blackMoves)).toHaveLength(0);
    expect(Object.keys(whiteMoves)).toHaveLength(1);
  });

  test('endgame scoring', () => {
    const board = Array.from({ length: 8 }, () => Array(8).fill('B'));
    board[0][0] = 'W';
    board[0][1] = 'W';
    const { black, white } = countPieces(board);
    expect(black).toBe(62);
    expect(white).toBe(2);
    expect(Object.keys(computeLegalMoves(board, 'B'))).toHaveLength(0);
    expect(Object.keys(computeLegalMoves(board, 'W'))).toHaveLength(0);
  });

  test('AI favors corners', () => {
    const board = createBoard();
    board[1][1] = 'W';
    board[2][2] = 'B';
    const move = bestMove(board, 'B', 3);
    expect(move).toEqual([0, 0]);
  });
});
