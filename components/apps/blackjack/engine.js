import { buildShoe, draw } from './domain/deck';
import { evaluateHand, cardPipValue } from './domain/hand';
import { createSeededRng } from './domain/rng';

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const cardValue = (card) => cardPipValue({ rank: card.value ?? card.rank, suit: card.suit });
export const handValue = (hand) => evaluateHand(hand.map((c) => ({ rank: c.value ?? c.rank, suit: c.suit }))).best;
export const isSoft = (hand) => evaluateHand(hand.map((c) => ({ rank: c.value ?? c.rank, suit: c.suit }))).isSoft;

export const calculateBustProbability = (handCards, composition) => {
  const counts = Object.entries(composition || {});
  const totalCards = counts.reduce((sum, [, count]) => sum + count, 0);
  if (!totalCards) return 0;
  const bustCards = counts.reduce((sum, [rank, count]) => {
    const best = evaluateHand([...handCards.map((c) => ({ rank: c.value ?? c.rank, suit: c.suit })), { rank, suit: '♠' }]).best;
    return sum + (best > 21 ? count : 0);
  }, 0);
  return bustCards / totalCards;
};

export class Shoe {
  constructor(decks = 6, penetration = 0.75, seed = 1337) {
    this.rng = createSeededRng(seed);
    this.decks = decks;
    this.penetration = penetration;
    this.shuffleCount = 0;
    this.shuffle();
  }
  shuffle() {
    this.state = buildShoe(this.decks, this.penetration, this.rng);
    this.cards = this.state.cards.map((c) => ({ suit: c.suit, value: c.rank }));
    this.shufflePoint = this.state.shufflePoint;
    this.dealt = this.state.dealt;
    this.runningCount = this.state.runningCount;
    this.shuffleCount += 1;
  }
  draw() {
    if (this.state.cards.length === 0 || this.state.dealt >= this.state.shufflePoint) this.shuffle();
    const dealt = draw(this.state);
    this.state = dealt.shoe;
    this.cards = this.state.cards.map((c) => ({ suit: c.suit, value: c.rank }));
    this.dealt = this.state.dealt;
    this.runningCount = this.state.runningCount;
    return { suit: dealt.card.suit, value: dealt.card.rank };
  }
}


export function basicStrategy(playerCards, dealerUpCard, options = {}) {
  const { canSplit = false, canDouble = false, canSurrender = false } = options;
  const up = dealerUpCard.value === 'A' ? 11 : cardValue(dealerUpCard);
  const total = handValue(playerCards);
  const values = playerCards.map((c) => c.value);
  const pair = values.length === 2 && cardValue(playerCards[0]) === cardValue(playerCards[1]);
  const soft = values.includes('A') && total <= 21;

  if (canSurrender && total === 16 && [9, 10, 11].includes(up)) return 'surrender';
  if (pair && canSplit && [8, 11].includes(cardValue(playerCards[0]))) return 'split';
  if (soft) return total >= 19 ? 'stand' : 'hit';
  if (total >= 17) return 'stand';
  if (total <= 11) return canDouble && total >= 9 ? 'double' : 'hit';
  return up <= 6 ? 'stand' : 'hit';
}

export class BlackjackGame {
  constructor() {
    throw new Error('Legacy BlackjackGame has been replaced by reducer/domain architecture.');
  }
}
