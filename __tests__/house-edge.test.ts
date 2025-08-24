import { computeHouseEdge } from '@components/apps/blackjack/engine';

describe('house edge', () => {
  test('basic strategy yields small negative expectation', () => {
    const edge = computeHouseEdge({ decks: 6, rounds: 10000 });
    expect(edge).toBeLessThan(0);
    expect(edge).toBeGreaterThan(-0.02);
  });
});
