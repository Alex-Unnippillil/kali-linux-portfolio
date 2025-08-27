import { updateScores, aiErrorOffset } from '../components/apps/pong-utils';

describe('Pong scoring', () => {
  it('increments opponent score when ball exits left', () => {
    const { scores } = updateScores(-1, 600, { player: 0, opponent: 0 });
    expect(scores).toEqual({ player: 0, opponent: 1 });
  });

  it('increments player score when ball exits right', () => {
    const { scores } = updateScores(601, 600, { player: 0, opponent: 0 });
    expect(scores).toEqual({ player: 1, opponent: 0 });
  });
});

describe('AI difficulty', () => {
  it('reduces error with higher difficulty', () => {
    const lowDiffError = Math.abs(aiErrorOffset(2, () => 1));
    const highDiffError = Math.abs(aiErrorOffset(8, () => 1));
    expect(lowDiffError).toBeGreaterThan(highDiffError);
  });
});
