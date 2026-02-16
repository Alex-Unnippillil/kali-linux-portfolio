import { buildShoe } from '../domain/deck';
import { dealerPlay, payout } from '../domain/rules';
import { createSeededRng } from '../domain/rng';
import { DEFAULT_CONFIG } from '../state/reducer';

const c = (rank: any) => ({ rank, suit: '♠' as const });

describe('blackjack rules', () => {
  test('dealer stands on soft 17 by default', () => {
    const shoe = buildShoe(1, 1, createSeededRng(42));
    const result = dealerPlay([c('A'), c('6')], shoe, { ...DEFAULT_CONFIG, dealerHitsSoft17: false });
    expect(result.dealerCards).toHaveLength(2);
  });

  test('dealer hits soft 17 when configured', () => {
    const shoe = { ...buildShoe(1, 1, createSeededRng(42)), cards: [c('2'), c('3')] };
    const result = dealerPlay([c('A'), c('6')], shoe, { ...DEFAULT_CONFIG, dealerHitsSoft17: true });
    expect(result.dealerCards.length).toBeGreaterThan(2);
  });

  test('payouts are correct', () => {
    expect(payout('blackjack', 100, DEFAULT_CONFIG)).toBe(250);
    expect(payout('win', 100, DEFAULT_CONFIG)).toBe(200);
    expect(payout('push', 100, DEFAULT_CONFIG)).toBe(100);
  });
});
