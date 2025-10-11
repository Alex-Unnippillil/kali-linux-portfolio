import {
  advanceWave,
  BASE_INVADER_ROWS,
  DEFAULT_LIVES,
  EXTRA_LIFE_THRESHOLDS,
  INVADER_COLUMNS,
  computeExtraLifeIndex,
  createGame,
  createWave,
  normalizeProgress,
} from '../apps/games/space-invaders';

describe('space-invaders engine helpers', () => {
  it('creates waves with predictable dimensions', () => {
    const wave1 = createWave(1, { phaseGenerator: () => 0 });
    expect(wave1).toHaveLength(INVADER_COLUMNS * BASE_INVADER_ROWS);
    expect(wave1[0]).toMatchObject({
      alive: true,
      phase: 0,
    });

    const wave3 = createWave(3, { phaseGenerator: () => 0 });
    expect(wave3).toHaveLength(INVADER_COLUMNS * (BASE_INVADER_ROWS + 2));
    expect(wave3.every((invader) => invader.alive)).toBe(true);
  });

  it('advances the wave once all invaders are cleared', () => {
    const state = createGame(1, { phaseGenerator: () => 0 });
    state.invaders.forEach((invader) => {
      // simulate defeating every invader in the wave
      invader.alive = false;
    });

    advanceWave(state, { phaseGenerator: () => 0 });

    expect(state.stage).toBe(2);
    expect(state.invaders).toHaveLength(
      INVADER_COLUMNS * (BASE_INVADER_ROWS + 1),
    );
    expect(state.invaders.every((invader) => invader.alive)).toBe(true);
  });

  it('normalizes persisted progress snapshots', () => {
    expect(
      normalizeProgress({ stage: -5, score: -10, lives: 0 }),
    ).toEqual({ stage: 1, score: 0, lives: DEFAULT_LIVES });

    expect(
      normalizeProgress({ stage: 4.8, score: 1234.9, lives: 2.2 }),
    ).toEqual({ stage: 4, score: 1234, lives: 2 });

    expect(normalizeProgress(null)).toEqual({
      stage: 1,
      score: 0,
      lives: DEFAULT_LIVES,
    });
  });

  it('computes the correct extra life index for a score', () => {
    expect(computeExtraLifeIndex(0)).toBe(0);
    expect(computeExtraLifeIndex(EXTRA_LIFE_THRESHOLDS[0])).toBe(1);
    expect(computeExtraLifeIndex(EXTRA_LIFE_THRESHOLDS[1] - 1)).toBe(1);
    expect(computeExtraLifeIndex(EXTRA_LIFE_THRESHOLDS[2] + 500)).toBe(
      EXTRA_LIFE_THRESHOLDS.length,
    );
  });
});
