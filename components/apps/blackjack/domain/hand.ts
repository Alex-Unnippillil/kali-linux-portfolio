import { Card } from './types';

export const cardPipValue = (card: Card): number => {
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J', '10'].includes(card.rank)) return 10;
  return Number(card.rank);
};

export const evaluateHand = (cards: Card[]) => {
  const totals = cards.reduce(
    (acc, card) => {
      if (card.rank === 'A') {
        const withAce = acc.flatMap((total) => [total + 1, total + 11]);
        return [...new Set(withAce)].sort((a, b) => a - b);
      }
      const value = cardPipValue(card);
      return [...new Set(acc.map((total) => total + value))].sort((a, b) => a - b);
    },
    [0] as number[],
  );

  const under = totals.filter((total) => total <= 21);
  const best = under.length ? under[under.length - 1] : totals[0];
  const isBust = under.length === 0;
  const isSoft = under.some((total) => total !== totals[0]);
  const isBlackjack = cards.length === 2 && best === 21;

  return { totals, best, isSoft, isBust, isBlackjack };
};
