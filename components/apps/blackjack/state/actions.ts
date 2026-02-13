import { GameConfig, PlayerAction } from '../domain/types';

export type BlackjackAction =
  | { type: 'PLACE_BET'; amount: number }
  | { type: 'DEAL' }
  | { type: 'PLAYER_ACTION'; action: PlayerAction }
  | { type: 'TAKE_INSURANCE' }
  | { type: 'SETTLE' }
  | { type: 'NEW_ROUND' }
  | { type: 'SET_CONFIG'; config: Partial<GameConfig> }
  | { type: 'HYDRATE'; payload: { bankroll: number; bet: number; repeatBet: number; stats: any; config: Partial<GameConfig> } };
