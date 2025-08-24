import { move, undo, redo, isGameOver } from '../engine';
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
});
