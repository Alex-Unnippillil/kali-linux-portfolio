import { Card, Rank, ShoeState, Suit } from './types';
import type { Rng } from './rng';

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const buildDeck = (): Card[] =>
  SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank })));

export const shuffle = (cards: Card[], rng: Rng): Card[] => {
  const next = [...cards];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

export const buildShoe = (decks: number, penetration: number, rng: Rng): ShoeState => {
  const cards = shuffle(Array.from({ length: decks }, () => buildDeck()).flat(), rng);
  return {
    cards,
    dealt: 0,
    decks,
    penetration,
    shufflePoint: Math.floor(cards.length * penetration),
    runningCount: 0,
  };
};

const countDelta = (rank: Rank): number => {
  if (['2', '3', '4', '5', '6'].includes(rank)) return 1;
  if (['10', 'J', 'Q', 'K', 'A'].includes(rank)) return -1;
  return 0;
};

export const draw = (shoe: ShoeState): { card: Card; shoe: ShoeState } => {
  const card = shoe.cards[shoe.cards.length - 1];
  return {
    card,
    shoe: {
      ...shoe,
      cards: shoe.cards.slice(0, -1),
      dealt: shoe.dealt + 1,
      runningCount: shoe.runningCount + countDelta(card.rank),
    },
  };
};

export const shoeNeedsShuffle = (shoe: ShoeState): boolean =>
  shoe.cards.length === 0 || shoe.dealt >= shoe.shufflePoint;

export const shoeCount = (shoe: ShoeState): number => shoe.cards.length;
