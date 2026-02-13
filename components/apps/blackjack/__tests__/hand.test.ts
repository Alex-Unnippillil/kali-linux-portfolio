import { evaluateHand } from '../domain/hand';

const c = (rank: any) => ({ rank, suit: '♠' as const });

describe('evaluateHand', () => {
  test('handles multiple aces', () => {
    const result = evaluateHand([c('A'), c('A'), c('9')]);
    expect(result.best).toBe(21);
    expect(result.isSoft).toBe(true);
  });

  test('detects blackjack', () => {
    const result = evaluateHand([c('A'), c('K')]);
    expect(result.isBlackjack).toBe(true);
  });

  test('detects bust', () => {
    const result = evaluateHand([c('10'), c('9'), c('8')]);
    expect(result.isBust).toBe(true);
  });
});
