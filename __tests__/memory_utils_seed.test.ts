import { createDeck, generateSeed } from '../components/apps/memory_utils';

describe('memory deck seeding', () => {
  test('same seed yields same deck order', () => {
    const seed = 'abc123';
    const first = createDeck(4, 'emoji', 'vibrant', seed);
    const second = createDeck(4, 'emoji', 'vibrant', seed);
    expect(first.map((c) => c.pairId)).toEqual(second.map((c) => c.pairId));
    expect(first).not.toBe(second);
  });

  test('different seeds yield different order', () => {
    const first = createDeck(4, 'letters', 'vibrant', 'seed-one');
    const second = createDeck(4, 'letters', 'vibrant', 'seed-two');
    expect(first.map((c) => c.pairId)).not.toEqual(second.map((c) => c.pairId));
  });

  test('generateSeed returns a string', () => {
    const seed = generateSeed();
    expect(typeof seed).toBe('string');
    expect(seed.length).toBeGreaterThan(0);
  });
});
