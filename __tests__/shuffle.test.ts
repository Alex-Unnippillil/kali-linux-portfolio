import { fisherYatesShuffle } from '@components/apps/memory_utils';

describe('fisherYatesShuffle fairness', () => {
  test('distribution is roughly uniform', () => {
    const iterations = 6000;
    const counts = [0, 0, 0];
    const arr = [1, 2, 3];
    for (let i = 0; i < iterations; i++) {
      const shuffled = fisherYatesShuffle(arr);
      counts[shuffled[0] - 1]++;
    }
    const expected = iterations / 3;
    const tolerance = iterations * 0.05; // 5%
    counts.forEach((c) => {
      expect(Math.abs(c - expected)).toBeLessThan(tolerance);
    });
  });
});
