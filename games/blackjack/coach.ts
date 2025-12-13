import { basicStrategy, cardValue } from '../../components/apps/blackjack/engine';

export interface Card {
  suit: string;
  value: string;
}

export interface Hand {
  cards: Card[];
  bet: number;
  fromSplit?: boolean;
}

export interface RulesConfig {
  allowDoubleAfterSplit?: boolean;
  allowSurrender?: boolean;
  allowSurrenderAfterSplit?: boolean;
}

/**
 * Recommend an action for the given hand using basic strategy.
 *
 * @param hand        The player's current hand.
 * @param dealerCard  Dealer's up card.
 * @param bankroll    Player's available bankroll.
 * @param rules       Optional table rules.
 * @returns           Recommended action: hit, stand, double, split or surrender.
 */
export function recommendAction(hand: Hand, dealerCard: Card, bankroll: number, rules?: RulesConfig): string {
  if (!hand || !dealerCard) return '';
  const allowDoubleAfterSplit = rules?.allowDoubleAfterSplit ?? true;
  const allowSurrender = rules?.allowSurrender ?? true;
  const allowSurrenderAfterSplit = rules?.allowSurrenderAfterSplit ?? false;
  return basicStrategy(hand.cards, dealerCard, {
    canDouble: hand.cards.length === 2 && bankroll >= hand.bet && (!hand.fromSplit || allowDoubleAfterSplit),
    canSplit:
      hand.cards.length === 2 &&
      cardValue(hand.cards[0]) === cardValue(hand.cards[1]) &&
      bankroll >= hand.bet,
    canSurrender: hand.cards.length === 2 && allowSurrender && (!hand.fromSplit || allowSurrenderAfterSplit),
  });
}
