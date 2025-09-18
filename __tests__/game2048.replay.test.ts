import {
  startRecording,
  recordMove,
  getReplayData,
  rewindLastMove,
  clearReplay,
} from '../games/2048/replay';
import { reset, deserialize, serialize } from '../apps/games/rng';
import {
  addRandomTile,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
  setSize,
  Board,
} from '../apps/games/_2048/logic';

describe('2048 replay integration', () => {
  const createEmptyBoard = (size: number): Board =>
    Array.from({ length: size }, () => Array(size).fill(0));

  afterEach(() => {
    clearReplay();
  });

  test('replay reproduces recorded moves deterministically', () => {
    const seed = 'test-seed';
    const size = 4;
    setSize(size);
    reset(seed);
    let board = createEmptyBoard(size);
    addRandomTile(board);
    addRandomTile(board);
    startRecording(board, 0, seed, size);

    const moveFn = (dir: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown') =>
      dir === 'ArrowLeft'
        ? moveLeft
        : dir === 'ArrowRight'
        ? moveRight
        : dir === 'ArrowUp'
        ? moveUp
        : moveDown;

    const moves: Array<'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'> = [];
    let score = 0;
    const directions: Array<'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'> = [
      'ArrowLeft',
      'ArrowUp',
      'ArrowRight',
      'ArrowDown',
    ];

    let attempts = 0;
    while (moves.length < 3 && attempts < 20) {
      const dir = directions[attempts % directions.length];
      attempts += 1;
      const { board: moved, score: gained } = moveFn(dir)(
        board.map((row) => [...row]),
      );
      if (boardsEqual(board, moved)) continue;
      addRandomTile(moved);
      board = moved;
      score += gained;
      recordMove(dir, board, score, false, false);
      moves.push(dir);
    }

    expect(moves.length).toBeGreaterThan(0);

    const replay = getReplayData();
    expect(replay).not.toBeNull();
    if (!replay) return;
    expect(replay.events).toHaveLength(moves.length);
    expect(replay.seed).toBe(seed);
    expect(replay.size).toBe(size);

    deserialize(replay.rng);
    setSize(replay.size);
    let replayBoard = replay.board.map((row) => [...row]);
    let replayScore = replay.score;

    replay.events.forEach((event) => {
      const { board: moved, score: gained } = moveFn(event.dir)(
        replayBoard.map((row) => [...row]),
      );
      addRandomTile(moved);
      replayBoard = moved;
      replayScore += gained;
      expect(boardsEqual(moved, event.board)).toBe(true);
      expect(serialize()).toBe(event.rng);
      expect(replayScore).toBe(event.score);
    });

    expect(boardsEqual(replayBoard, board)).toBe(true);
  });

  test('rewind removes the last recorded move', () => {
    const seed = 'rewind-seed';
    const size = 4;
    setSize(size);
    reset(seed);
    let board = createEmptyBoard(size);
    addRandomTile(board);
    addRandomTile(board);
    startRecording(board, 0, seed, size);

    const { board: moved, score } = moveLeft(board.map((row) => [...row]));
    addRandomTile(moved);
    board = moved;
    recordMove('ArrowLeft', board, score, false, false);
    expect(getReplayData()?.events).toHaveLength(1);
    rewindLastMove();
    expect(getReplayData()?.events).toHaveLength(0);
  });
});
