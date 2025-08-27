import { fisherYatesShuffle, createSeededRNG, createDeck } from '../components/apps/memory_utils';

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

  test('seeded shuffle is deterministic', () => {
    const arr = [1, 2, 3, 4, 5];
    const rng1 = createSeededRNG('seed');
    const rng2 = createSeededRNG('seed');
    expect(fisherYatesShuffle(arr, rng1)).toEqual(fisherYatesShuffle(arr, rng2));
  });
});

describe('createDeck seeding', () => {
  test('same seed yields same deck', () => {
    const deck1 = createDeck(2, { seed: 'race' });
    const deck2 = createDeck(2, { seed: 'race' });
    expect(deck1).toEqual(deck2);
  });
});
