import { cardPipValue, evaluateHand } from './hand';
import { draw } from './deck';
import { GameConfig, HandState, PlayerAction, RoundState, ShoeState } from './types';

export const legalActions = (state: RoundState, config: GameConfig): PlayerAction[] => {
  if (state.phase !== 'PLAYER_TURN') return [];
  const hand = state.playerHands[state.currentHandIndex];
  if (!hand || hand.finished || !hand.canDraw) return [];

  const actions: PlayerAction[] = ['HIT', 'STAND'];
  const isTwoCardHand = hand.cards.length === 2;
  const canAffordDouble = state.bankroll >= hand.bet;
  const totalSplits = state.playerHands.length - 1;
  const isPair = isTwoCardHand && cardPipValue(hand.cards[0]) === cardPipValue(hand.cards[1]);

  if (isTwoCardHand && canAffordDouble && (!hand.splitFromAces || config.allowDoubleAfterSplit)) {
    actions.push('DOUBLE');
  }
  if (isPair && canAffordDouble && totalSplits < config.maxSplits && !hand.splitFromAces) {
    actions.push('SPLIT');
  }
  if (config.allowSurrender && isTwoCardHand && !hand.doubled) {
    actions.push('SURRENDER');
  }

  return actions;
};

export const payout = (
  outcome: 'blackjack' | 'win' | 'lose' | 'push' | 'surrender',
  bet: number,
  config: GameConfig,
): number => {
  if (outcome === 'blackjack') return bet + Math.floor(bet * config.blackjackPayout);
  if (outcome === 'win') return bet * 2;
  if (outcome === 'push') return bet;
  if (outcome === 'surrender') return Math.floor(bet / 2);
  return 0;
};

export const dealerPlay = (
  dealerCards: HandState['cards'],
  shoe: ShoeState,
  config: GameConfig,
): { dealerCards: HandState['cards']; shoe: ShoeState } => {
  let nextCards = [...dealerCards];
  let nextShoe = shoe;
  while (true) {
    const summary = evaluateHand(nextCards);
    const hitSoft17 = config.dealerHitsSoft17 && summary.best === 17 && summary.isSoft;
    if (summary.best > 17 || (summary.best === 17 && !hitSoft17)) break;
    const drawn = draw(nextShoe);
    nextCards = [...nextCards, drawn.card];
    nextShoe = drawn.shoe;
  }
  return { dealerCards: nextCards, shoe: nextShoe };
};

export const handResult = (
  hand: HandState,
  dealerCards: HandState['cards'],
  dealerHasBlackjack: boolean,
  config: GameConfig,
): { result: 'win' | 'lose' | 'push'; payoutValue: number; label: string } => {
  const playerSummary = evaluateHand(hand.cards);
  const dealerSummary = evaluateHand(dealerCards);
  const isNaturalBlackjack = playerSummary.isBlackjack && !hand.splitFromAces;

  if (hand.surrendered) {
    return { result: 'lose', payoutValue: payout('surrender', hand.bet, config), label: 'Surrender' };
  }
  if (playerSummary.isBust) {
    return { result: 'lose', payoutValue: 0, label: 'Bust' };
  }
  if (dealerHasBlackjack && !isNaturalBlackjack) {
    return { result: 'lose', payoutValue: 0, label: 'Dealer blackjack' };
  }
  if (isNaturalBlackjack && !dealerHasBlackjack) {
    return { result: 'win', payoutValue: payout('blackjack', hand.bet, config), label: 'Blackjack' };
  }
  if (dealerSummary.isBust || playerSummary.best > dealerSummary.best) {
    return { result: 'win', payoutValue: payout('win', hand.bet, config), label: 'Win' };
  }
  if (playerSummary.best === dealerSummary.best) {
    return { result: 'push', payoutValue: payout('push', hand.bet, config), label: 'Push' };
  }
  return { result: 'lose', payoutValue: 0, label: 'Lose' };
};
