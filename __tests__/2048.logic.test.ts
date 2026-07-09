import { applyMove, hasLegalMove, processLine, GameState, Board } from '../apps/games/_2048/logic';
import { createRng } from '../apps/games/rng';

const emptyCount = (board: Board) => board.flat().filter((cell) => cell === 0).length;

const makeState = (board: Board, rngSeed = 'seed'): GameState => {
  const rng = createRng(undefined, rngSeed);
  return {
    size: board.length,
    board,
    score: 0,
    won: false,
    over: false,
    keepPlaying: false,
    rng: rng.serialize(),
  };
};

describe('processLine', () => {
  it('collapses zeros and preserves empty lines', () => {
    expect(processLine([0, 0, 0, 0]).out).toEqual([0, 0, 0, 0]);
  });

  it('merges pairs and leaves trailing zeros', () => {
    expect(processLine([2, 0, 2, 0]).out).toEqual([4, 0, 0, 0]);
  });

  it('merges the pair farthest along the direction first', () => {
    expect(processLine([2, 2, 2, 0]).out).toEqual([4, 2, 0, 0]);
  });

  it('prevents double merges in the same move', () => {
    expect(processLine([2, 2, 2, 2]).out).toEqual([4, 4, 0, 0]);
    expect(processLine([4, 4, 2, 2]).out).toEqual([8, 4, 0, 0]);
  });
});

describe('applyMove', () => {
  it('does not spawn when the board does not change', () => {
    const board: Board = [
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const state = makeState(board);
    const outcome = applyMove(state, 'ArrowLeft');
    expect(outcome.moved).toBe(false);
    expect(outcome.next.board).toEqual(board);
    expect(outcome.next.rng).toBe(state.rng);
  });

  it('spawns exactly one tile after a legal move', () => {
    const board: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const state = makeState(board);
    const beforeEmpty = emptyCount(state.board);
    const outcome = applyMove(state, 'ArrowLeft');
    expect(outcome.moved).toBe(true);
    const afterEmpty = emptyCount(outcome.next.board);
    expect(afterEmpty).toBe(beforeEmpty);
    expect(outcome.next.score).toBe(4);
  });

  it('sets won and allows continuing after keepPlaying', () => {
    const board: Board = [
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    const state = makeState(board);
    const first = applyMove(state, 'ArrowLeft');
    expect(first.next.won).toBe(true);
    const blocked = applyMove(first.next, 'ArrowLeft');
    expect(blocked.moved).toBe(false);
    const continued = applyMove({ ...first.next, keepPlaying: true }, 'ArrowRight');
    expect(continued.moved).toBe(true);
  });

  it('marks over when no legal moves remain', () => {
    const board: Board = [
      [2, 4, 8, 16],
      [32, 64, 128, 256],
      [512, 1024, 2, 4],
      [8, 16, 32, 64],
    ];
    const state = makeState(board);
    expect(hasLegalMove(board)).toBe(false);
    const outcome = applyMove(state, 'ArrowLeft');
    expect(outcome.next.over).toBe(true);
    expect(outcome.moved).toBe(false);
  });
});
