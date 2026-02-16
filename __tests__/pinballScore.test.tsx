import { ScoreSystem } from '../components/apps/pinball/rules/scoring';
import { insertHighScore } from '../components/apps/pinball/persistence/storage';

describe('pinball scoring rules', () => {
  it('increases multiplier for quick bumper combos', () => {
    const scoring = new ScoreSystem();
    scoring.onHit('bumper', 0);
    scoring.onHit('bumper', 1);
    scoring.onHit('bumper', 1.5);
    expect(scoring.getSnapshot().multiplier).toBeGreaterThan(1);
  });

  it('awards bonus on end ball and resets combo state', () => {
    const scoring = new ScoreSystem();
    scoring.onHit('target', 0);
    const bonus = scoring.endBallBonus();
    expect(bonus).toBeGreaterThan(0);
    expect(scoring.getSnapshot().multiplier).toBe(1);
    expect(scoring.getSnapshot().comboCount).toBe(0);
  });
});

describe('pinball high score persistence helpers', () => {
  it('inserts high score and keeps sorted order', () => {
    const entries = [
      { name: 'A', score: 300, createdAt: 1 },
      { name: 'B', score: 100, createdAt: 2 },
    ];
    const next = insertHighScore(entries, { name: 'C', score: 250, createdAt: 3 });
    expect(next.map((e) => e.score)).toEqual([300, 250, 100]);
  });
});
