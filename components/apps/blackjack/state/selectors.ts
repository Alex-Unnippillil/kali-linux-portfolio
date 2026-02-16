import { legalActions } from '../domain/rules';
import { evaluateHand } from '../domain/hand';
import { GameConfig, RoundState } from '../domain/types';

export const selectCurrentHand = (state: RoundState) => state.playerHands[state.currentHandIndex];
export const selectCanDeal = (state: RoundState) => state.phase === 'BETTING' && state.bet > 0 && state.bet <= state.bankroll;
export const selectLegalActions = (state: RoundState, config: GameConfig) => legalActions(state, config);
export const selectDealerSummary = (state: RoundState) => evaluateHand(state.dealerHand);
export const selectInsuranceAvailable = (state: RoundState) =>
  state.phase === 'PLAYER_TURN' && state.dealerHand[0]?.rank === 'A' && !state.insuranceTaken;
