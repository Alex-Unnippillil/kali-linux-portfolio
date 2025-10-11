import {
  DEFAULT_PROGRESS,
  loadLegacyProgress,
  isValidProgress,
  rotateMatrix,
  TETROMINOS,
} from '../games/tetris/logic';

describe('tetris engine helpers', () => {
  it('rotates tetromino shapes clockwise using SRS', () => {
    const snapshot = TETROMINOS.T.shape.map((row) => [...row]);
    const rotated = rotateMatrix(TETROMINOS.T.shape);
    expect(rotated).toEqual([
      [1, 0],
      [1, 1],
      [1, 0],
    ]);
    // Ensure original data is not mutated
    expect(TETROMINOS.T.shape).toEqual(snapshot);
  });

  it('validates persisted progress shape', () => {
    expect(isValidProgress(DEFAULT_PROGRESS)).toBe(true);
    expect(
      isValidProgress({ highScore: 10, maxLevel: 2, bestSprint: 1500 }),
    ).toBe(true);
    expect(
      isValidProgress({ highScore: '10', maxLevel: 2, bestSprint: null }),
    ).toBe(false);
  });

  it('migrates legacy localStorage keys when present', () => {
    const store = new Map<string, string | null>([
      ['tetris-high-score', JSON.stringify(4200)],
      ['tetris-max-level', JSON.stringify(9)],
      ['tetris-best-time', JSON.stringify(93500)],
    ]);
    const legacy = loadLegacyProgress((key) => store.get(key) ?? null);
    expect(legacy).toEqual({
      highScore: 4200,
      maxLevel: 9,
      bestSprint: 93500,
    });
  });

  it('ignores invalid legacy payloads gracefully', () => {
    const store = new Map<string, string | null>([
      ['tetris-high-score', JSON.stringify('oops')],
      ['tetris-max-level', null],
      ['tetris-best-time', 'invalid json'],
    ]);
    const legacy = loadLegacyProgress((key) => store.get(key) ?? null);
    expect(legacy).toEqual({});
  });
});
