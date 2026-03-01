import { computeLineClearScore } from '../games/tetris/scoring';

describe('tetris scoring', () => {
  it('applies combo, back-to-back, and perfect clear bonuses', () => {
    const score = computeLineClearScore({
      linesCleared: 4,
      level: 1,
      isTSpin: false,
      isB2B: true,
      combo: 3,
      perfectClear: true,
    });

    expect(score.base).toBe(800);
    expect(score.b2b).toBeGreaterThan(0);
    expect(score.combo).toBeGreaterThan(0);
    expect(score.perfectClear).toBeGreaterThan(0);
    expect(score.total).toBe(score.base + score.b2b + score.combo + score.perfectClear);
  });

  it('uses T-spin scoring tables', () => {
    const score = computeLineClearScore({
      linesCleared: 2,
      level: 1,
      isTSpin: true,
      isB2B: false,
      combo: 1,
      perfectClear: false,
    });

    expect(score.base).toBe(800);
  });
});
