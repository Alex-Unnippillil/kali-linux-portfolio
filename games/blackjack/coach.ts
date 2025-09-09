// Helper module for the Blackjack game. It exposes a thin wrapper around
// the core engine's basic strategy implementation so components can ask
// for move recommendations.
import { basicStrategy, cardValue } from '../../components/apps/blackjack/engine';

export interface Card {
  suit: string;
  value: string;
}

export interface Hand {
  cards: Card[];
  bet: number;
}

/**
 * Recommend an action for the given hand using basic strategy.
 *
 * @param hand        The player's current hand.
 * @param dealerCard  Dealer's up card.
 * @param bankroll    Player's available bankroll.
 * @returns           Recommended action: hit, stand, double, split or surrender.
 */
export function recommendAction(hand: Hand, dealerCard: Card, bankroll: number): string {
  if (!hand || !dealerCard) return '';
  return basicStrategy(hand.cards, dealerCard, {
    canDouble: bankroll >= hand.bet,
    canSplit:
      hand.cards.length === 2 &&
      cardValue(hand.cards[0]) === cardValue(hand.cards[1]) &&
      bankroll >= hand.bet,
    canSurrender: hand.cards.length === 2,
  });
}
