import { replayLabel, validateReplayData } from '../components/apps/snakeReplay';

describe('snake replay compatibility', () => {
  it('accepts legacy frames replay', () => {
    const replay = {
      frames: [
        {
          snake: [{ x: 1, y: 1 }],
          food: { x: 2, y: 2 },
          obstacles: [],
          score: 7,
        },
      ],
    };

    expect(validateReplayData(replay)).toBeTruthy();
    expect(replayLabel('legacy-slot', replay)).toContain('Score 7');
  });

  it('accepts current deterministic inputs replay', () => {
    const replay = {
      seed: 'seed-1',
      settings: { wrap: true, obstaclesEnabled: false },
      inputs: [{ stepIndex: 1, dir: { x: 1, y: 0 } }],
      metadata: { finalScore: 3, createdAt: '2026-02-10T18:42:00.000Z' },
    };

    expect(validateReplayData(replay)).toBeTruthy();
    expect(replayLabel('inputs-slot', replay)).toContain('Score 3');
  });
});
