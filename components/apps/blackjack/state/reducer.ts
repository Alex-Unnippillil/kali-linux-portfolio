import {
  applyPlayerAction,
  createInitialState,
  dealInitial,
  placeBet,
  settleRound,
  startNewRound,
  takeInsurance,
} from '../domain/game';
import { createSeededRng } from '../domain/rng';
import { GameConfig, RoundState } from '../domain/types';
import { BlackjackAction } from './actions';

export const DEFAULT_CONFIG: GameConfig = {
  decks: 6,
  penetration: 0.75,
  blackjackPayout: 1.5,
  dealerHitsSoft17: false,
  allowSurrender: false,
  allowDoubleAfterSplit: true,
  maxSplits: 3,
  splitAcesOneCardOnly: true,
  minBet: 5,
  maxHands: 4,
  dealerPeek: true,
};

const warn = (message: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[Blackjack] ${message}`);
  }
};

export const createBlackjackState = (seed = 1337, config = DEFAULT_CONFIG): RoundState =>
  createInitialState(config, createSeededRng(seed));

export const blackjackReducer = (
  state: RoundState,
  action: BlackjackAction,
  config: GameConfig,
  seed: number,
): RoundState => {
  const rng = createSeededRng(seed + state.stats.hands + state.shoe.dealt + 1);
  switch (action.type) {
    case 'PLACE_BET':
      return placeBet(state, action.amount, config);
    case 'DEAL': {
      const next = dealInitial(state, config, rng);
      if (next === state) warn('Ignored invalid DEAL action.');
      return next;
    }
    case 'PLAYER_ACTION': {
      const next = applyPlayerAction(state, action.action, config, rng);
      if (next === state) warn(`Ignored invalid PLAYER_ACTION ${action.action}.`);
      return next;
    }
    case 'TAKE_INSURANCE':
      return takeInsurance(state);
    case 'SETTLE':
      return settleRound(state, config);
    case 'NEW_ROUND':
      return startNewRound(state);
    case 'HYDRATE':
      return {
        ...state,
        bankroll: action.payload.bankroll,
        bet: action.payload.bet,
        repeatBet: action.payload.repeatBet,
        stats: action.payload.stats ?? state.stats,
      };
    default:
      return state;
  }
};
