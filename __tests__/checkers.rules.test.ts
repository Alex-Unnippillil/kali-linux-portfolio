import { applyStep, createGameState, getForcedFromSquares, getLegalMoves } from '../games/checkers/logic';
import { Board, Move, serializePosition } from '../components/apps/checkers/engine';

const emptyBoard = (): Board =>
  Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));

const primeState = (
  board: Board,
  turn: 'red' | 'black' = 'red',
  mode: 'forced' | 'relaxed' = 'forced',
) => {
  const state = createGameState(mode);
  state.board = board;
  state.turnState.turn = turn;
  state.turnState.pendingCaptureFrom = null;
  state.turnState.turnHadCapture = false;
  state.turnState.turnHadKinging = false;
  state.noCaptureMoves = 0;
  state.positionCounts = new Map([
    [serializePosition(board, turn, state.turnState.pendingCaptureFrom, mode), 1],
  ]);
  return state;
};

describe('checkers rules', () => {
  test('capture priority in forced mode', () => {
    const board = emptyBoard();
    board[5][0] = { color: 'red', king: false };
    board[4][1] = { color: 'black', king: false };
    board[5][2] = { color: 'red', king: false };
    const state = primeState(board);
    const moves = getLegalMoves(state);
    expect(moves).toEqual([
      { from: [5, 0], to: [3, 2], captured: [4, 1] },
      { from: [5, 2], to: [3, 0], captured: [4, 1] },
    ]);
    const forced = getForcedFromSquares(state);
    expect(forced.has('5-0')).toBe(true);
    expect(forced.has('5-2')).toBe(true);
  });

  test('multi-jump continuation is enforced', () => {
    const board = emptyBoard();
    board[5][0] = { color: 'red', king: false };
    board[4][1] = { color: 'black', king: false };
    board[2][3] = { color: 'black', king: false };
    const state = primeState(board);
    const first = getLegalMoves(state)[0];
    const { next } = applyStep(state, first);
    expect(next.turnState.pendingCaptureFrom).toEqual([3, 2]);
    const nextMoves = getLegalMoves(next);
    expect(nextMoves.every((m) => m.captured)).toBe(true);
    expect(new Set(nextMoves.map((m) => `${m.from[0]}-${m.from[1]}`))).toEqual(new Set(['3-2']));
  });

  test('kinging mid-jump ends the turn when crownEndsTurn is true', () => {
    const board = emptyBoard();
    board[2][3] = { color: 'red', king: false };
    board[1][4] = { color: 'black', king: false };
    board[1][2] = { color: 'black', king: false };
    const state = primeState(board);
    const move = getLegalMoves(state).find((m) => m.to[0] === 0 && m.to[1] === 5) as Move;
    const { next, events } = applyStep(state, move);
    expect(events.kinged).toBe(true);
    expect(events.turnEnded).toBe(true);
    expect(next.turnState.pendingCaptureFrom).toBeNull();
  });

  test('no-move endgame detection', () => {
    const board = emptyBoard();
    board[5][0] = { color: 'red', king: false };
    board[0][7] = { color: 'black', king: false };
    board[1][6] = { color: 'red', king: false };
    board[2][5] = { color: 'red', king: false };
    const state = primeState(board);
    const move = getLegalMoves(state).find((m) => m.from[0] === 5 && m.from[1] === 0)!;
    const { next, events } = applyStep(state, move);
    expect(getLegalMoves(next)).toHaveLength(0);
    expect(events.winner).toBe('red');
  });

  test('repetition draw triggers at third occurrence', () => {
    const board = emptyBoard();
    board[5][0] = { color: 'red', king: false };
    const state = primeState(board, 'red', 'forced');
    const key = serializePosition(board, 'red', null, 'forced');
    state.positionCounts = new Map([[key, 2]]);
    state.noCaptureMoves = 39;
    const move = { from: [5, 0], to: [4, 1] } as Move;
    const { events } = applyStep(state, move);
    expect(events.draw).toBe(true);
  });
});
