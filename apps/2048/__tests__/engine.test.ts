import { move, undo, redo, isGameOver, spawnTile, createRng } from '../engine';
import type { Board, GameState } from '../engine';

describe('2048 engine', () => {
  const rng = () => 0; // deterministic

  test('swipe merges identical tiles', () => {
    const start: GameState = {
      board: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      score: 0,
      history: [],
      future: [],
    };
    const next = move(start, 'left', rng);
    expect(next.board.slice(0, 4)).toEqual([4, 2, 0, 0]);
    expect(next.score).toBe(4);
  });

  test('blocked multiple merges', () => {
    const start: GameState = {
      board: [2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      score: 0,
      history: [],
      future: [],
    };
    const next = move(start, 'left', rng);
    expect(next.board.slice(0, 4)).toEqual([4, 4, 2, 0]);
    expect(next.score).toBe(8);
  });

  test('undo and redo', () => {
    const start: GameState = {
      board: [2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      score: 0,
      history: [],
      future: [],
    };
    const moved = move(start, 'left', rng);
    const undone = undo(moved);
    expect(undone.board).toEqual(start.board);
    const redone = redo(undone);
    expect(redone.board.slice(0, 4)).toEqual([4, 2, 0, 0]);
  });

  test('game over detection', () => {
    const board: Board = [
      2, 4, 2, 4,
      4, 2, 4, 2,
      2, 4, 2, 4,
      4, 2, 4, 2,
    ];
    expect(isGameOver(board)).toBe(true);
  });

  test('spawn tile uses 90/10 distribution', () => {
    const board = Array(16).fill(0);
    const rng2 = (() => {
      const seq = [0, 0.8];
      let i = 0;
      return () => seq[i++];
    })();
    expect(spawnTile(board, rng2)[0]).toBe(2);
    const rng4 = (() => {
      const seq = [0, 0.95];
      let i = 0;
      return () => seq[i++];
    })();
    expect(spawnTile(board, rng4)[0]).toBe(4);
  });

  test('seeded RNG is deterministic', () => {
    const a = createRng(123);
    const b = createRng(123);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });
});
