import { buildShoe, draw, shoeNeedsShuffle } from './deck';
import { evaluateHand } from './hand';
import type { Rng } from './rng';
import { dealerPlay, handResult } from './rules';
import { GameConfig, HandState, PlayerAction, RoundState } from './types';

const makeHand = (id: string, cards: HandState['cards'], bet: number, splitFromAces = false): HandState => ({
  id,
  cards,
  bet,
  finished: false,
  doubled: false,
  surrendered: false,
  splitFromAces,
  canDraw: !(splitFromAces),
});

const logEvent = (state: RoundState, message: string): RoundState => ({
  ...state,
  eventLog: [...state.eventLog.slice(-11), { id: `${Date.now()}-${state.eventLog.length}`, message }],
});

export const createInitialState = (config: GameConfig, rng: Rng): RoundState => ({
  phase: 'BETTING',
  bankroll: 1000,
  bet: config.minBet,
  repeatBet: config.minBet,
  insuranceBet: 0,
  insuranceTaken: false,
  dealerHand: [],
  playerHands: [],
  currentHandIndex: 0,
  shoe: buildShoe(config.decks, config.penetration, rng),
  stats: { wins: 0, losses: 0, pushes: 0, hands: 0, streak: 0, bestStreak: 0 },
  eventLog: [],
  lastOutcome: 'Waiting for next round.',
});

export const placeBet = (state: RoundState, amount: number, config: GameConfig): RoundState => {
  if (state.phase !== 'BETTING') return state;
  const next = Math.max(config.minBet, Math.min(amount, state.bankroll));
  return { ...state, bet: next, repeatBet: next };
};

const ensureShoe = (state: RoundState, config: GameConfig, rng: Rng): RoundState => {
  if (!shoeNeedsShuffle(state.shoe)) return state;
  return logEvent({ ...state, shoe: buildShoe(config.decks, config.penetration, rng) }, 'Reshuffled shoe.');
};

export const dealInitial = (state: RoundState, config: GameConfig, rng: Rng): RoundState => {
  if (state.phase !== 'BETTING' || state.bet <= 0 || state.bet > state.bankroll) return state;
  let next = ensureShoe(state, config, rng);
  let shoe = next.shoe;

  const p1 = draw(shoe); shoe = p1.shoe;
  const d1 = draw(shoe); shoe = d1.shoe;
  const p2 = draw(shoe); shoe = p2.shoe;
  const d2 = draw(shoe); shoe = d2.shoe;

  const playerHands = [makeHand('h-0', [p1.card, p2.card], state.bet)];
  const dealerHand = [d1.card, d2.card];
  const updated = logEvent(
    {
      ...next,
      phase: 'PLAYER_TURN',
      bankroll: state.bankroll - state.bet,
      playerHands,
      dealerHand,
      currentHandIndex: 0,
      insuranceBet: 0,
      insuranceTaken: false,
      shoe,
    },
    'Cards dealt.',
  );
  return updated;
};

const moveToNextHand = (state: RoundState): RoundState => {
  const idx = state.playerHands.findIndex((h, index) => index >= state.currentHandIndex && !h.finished);
  if (idx === -1) return { ...state, phase: 'DEALER_TURN', currentHandIndex: state.playerHands.length };
  return { ...state, currentHandIndex: idx };
};

export const applyPlayerAction = (
  state: RoundState,
  action: PlayerAction,
  config: GameConfig,
  rng: Rng,
): RoundState => {
  if (state.phase !== 'PLAYER_TURN') return state;
  const hand = state.playerHands[state.currentHandIndex];
  if (!hand || hand.finished) return state;

  let playerHands = [...state.playerHands];
  let bankroll = state.bankroll;
  let shoe = state.shoe;

  if (action === 'HIT') {
    const dealt = draw(shoe);
    shoe = dealt.shoe;
    const cards = [...hand.cards, dealt.card];
    const summary = evaluateHand(cards);
    playerHands[state.currentHandIndex] = { ...hand, cards, finished: summary.isBust };
    return moveToNextHand(logEvent({ ...state, playerHands, shoe }, summary.isBust ? 'Player busts.' : 'Player hits.'));
  }

  if (action === 'STAND') {
    playerHands[state.currentHandIndex] = { ...hand, finished: true };
    return moveToNextHand(logEvent({ ...state, playerHands }, 'Player stands.'));
  }

  if (action === 'DOUBLE' && hand.cards.length === 2 && bankroll >= hand.bet) {
    bankroll -= hand.bet;
    const dealt = draw(shoe);
    shoe = dealt.shoe;
    const cards = [...hand.cards, dealt.card];
    const summary = evaluateHand(cards);
    playerHands[state.currentHandIndex] = {
      ...hand,
      cards,
      bet: hand.bet * 2,
      doubled: true,
      finished: true,
      canDraw: false,
    };
    return moveToNextHand(logEvent({ ...state, playerHands, bankroll, shoe }, summary.isBust ? 'Double and bust.' : 'Player doubles.'));
  }

  if (action === 'SPLIT' && hand.cards.length === 2 && bankroll >= hand.bet) {
    const [first, second] = hand.cards;
    if ((first.rank === second.rank || (first.rank === '10' && second.rank !== 'A') || (second.rank === '10' && first.rank !== 'A')) === false) {
      return state;
    }
    bankroll -= hand.bet;
    const a = draw(shoe); shoe = a.shoe;
    const b = draw(shoe); shoe = b.shoe;
    const splitAces = first.rank === 'A' && second.rank === 'A';
    const left = makeHand(`${hand.id}-a`, [first, a.card], hand.bet, splitAces);
    const right = makeHand(`${hand.id}-b`, [second, b.card], hand.bet, splitAces);
    if (splitAces && config.splitAcesOneCardOnly) {
      left.finished = true; left.canDraw = false;
      right.finished = true; right.canDraw = false;
    }
    playerHands.splice(state.currentHandIndex, 1, left, right);
    return moveToNextHand(logEvent({ ...state, playerHands, bankroll, shoe }, 'Hand split.'));
  }

  if (action === 'SURRENDER' && config.allowSurrender && hand.cards.length === 2) {
    playerHands[state.currentHandIndex] = { ...hand, finished: true, surrendered: true, canDraw: false };
    return moveToNextHand(logEvent({ ...state, playerHands }, 'Player surrenders.'));
  }

  return state;
};

export const settleRound = (state: RoundState, config: GameConfig): RoundState => {
  if (!['DEALER_TURN', 'SETTLEMENT'].includes(state.phase)) return state;
  const dealerSummary = evaluateHand(state.dealerHand);
  const dealerHasBlackjack = dealerSummary.isBlackjack;

  const dealerResult = dealerHasBlackjack
    ? { dealerCards: state.dealerHand, shoe: state.shoe }
    : dealerPlay(state.dealerHand, state.shoe, config);

  let bankroll = state.bankroll;
  let wins = state.stats.wins;
  let losses = state.stats.losses;
  let pushes = state.stats.pushes;
  let streak = state.stats.streak;

  const playerHands = state.playerHands.map((hand) => {
    const outcome = handResult(hand, dealerResult.dealerCards, dealerHasBlackjack, config);
    bankroll += outcome.payoutValue;
    if (outcome.result === 'win') { wins += 1; streak += 1; }
    else if (outcome.result === 'lose') { losses += 1; streak = 0; }
    else { pushes += 1; }
    return { ...hand, finished: true, result: outcome.result, payout: outcome.payoutValue };
  });

  if (state.insuranceTaken && dealerHasBlackjack) {
    bankroll += state.insuranceBet * 3;
  }

  const outcome = playerHands.map((h) => h.result).join(', ');

  return logEvent({
    ...state,
    phase: 'SETTLEMENT',
    dealerHand: dealerResult.dealerCards,
    playerHands,
    bankroll,
    shoe: dealerResult.shoe,
    stats: {
      ...state.stats,
      wins,
      losses,
      pushes,
      hands: state.stats.hands + playerHands.length,
      streak,
      bestStreak: Math.max(state.stats.bestStreak, streak),
    },
    lastOutcome: `Round complete: ${outcome}`,
  }, 'Round settled.');
};

export const startNewRound = (state: RoundState): RoundState => ({
  ...state,
  phase: 'BETTING',
  dealerHand: [],
  playerHands: [],
  currentHandIndex: 0,
  insuranceBet: 0,
  insuranceTaken: false,
  warning: undefined,
});

export const takeInsurance = (state: RoundState): RoundState => {
  if (state.phase !== 'PLAYER_TURN' || state.dealerHand[0]?.rank !== 'A' || state.insuranceTaken) return state;
  const insuranceBet = Math.min(Math.floor(state.bet / 2), state.bankroll);
  if (!insuranceBet) return state;
  return logEvent({ ...state, insuranceTaken: true, insuranceBet, bankroll: state.bankroll - insuranceBet }, 'Insurance taken.');
};
