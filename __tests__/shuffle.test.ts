import { fisherYates } from '@components/apps/blackjack/engine';

describe('fisherYates shuffle', () => {
  test('produces roughly uniform permutations', () => {
    let seed = 42;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const original = Math.random;
    Math.random = random;

    const counts: Record<string, number> = {};
    const runs = 6000;
    for (let i = 0; i < runs; i += 1) {
      const perm = fisherYates([1, 2, 3]).join('');
      counts[perm] = (counts[perm] || 0) + 1;
    }
    Math.random = original;

    const expected = runs / 6;
    Object.values(counts).forEach((c) => {
      expect(c).toBeGreaterThan(expected * 0.9);
      expect(c).toBeLessThan(expected * 1.1);
    });
  });
});
