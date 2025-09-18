import { performance } from 'perf_hooks';
import { findHint, scoreMoves } from '../apps/games/_2048/ai';
import type { Board } from '../apps/games/_2048/logic';

describe('2048 hint heuristics', () => {
  const horizontalBoard: Board = [
    [0, 2, 4, 8],
    [0, 4, 8, 16],
    [2, 8, 16, 32],
    [4, 16, 32, 64],
  ];

  const verticalBoard: Board = [
    [2, 4, 8, 16],
    [0, 4, 8, 16],
    [0, 8, 16, 32],
    [0, 16, 32, 64],
  ];

  test('findHint runs in under 16ms', () => {
    const iterations = 200;
    const start = performance.now();
    let move: ReturnType<typeof findHint> = null;
    for (let i = 0; i < iterations; i += 1) {
      move = findHint(horizontalBoard);
    }
    const duration = (performance.now() - start) / iterations;
    expect(duration).toBeLessThan(16);
    expect(move).toBe('ArrowLeft');
  });

  test('prefers monotonic horizontal moves', () => {
    const move = findHint(horizontalBoard);
    expect(move).toBe('ArrowLeft');
    const scores = scoreMoves(horizontalBoard);
    const leftScore = scores.ArrowLeft ?? Number.NEGATIVE_INFINITY;
    const upScore = scores.ArrowUp ?? Number.NEGATIVE_INFINITY;
    expect(leftScore).toBeGreaterThan(upScore);
  });

  test('prefers monotonic vertical moves', () => {
    expect(findHint(verticalBoard)).toBe('ArrowUp');
    const scores = scoreMoves(verticalBoard);
    const upScore = scores.ArrowUp ?? Number.NEGATIVE_INFINITY;
    const rightScore = scores.ArrowRight ?? Number.NEGATIVE_INFINITY;
    expect(upScore).toBeGreaterThan(rightScore);
  });
});
