import { GameConfig, PersistedBlackjackState, RoundState } from '../domain/types';

const KEY = 'blackjack-state-v2';
const VERSION = 2;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export const saveState = (state: RoundState, config: GameConfig): void => {
  if (typeof window === 'undefined') return;
  const payload: PersistedBlackjackState = {
    version: VERSION,
    bankroll: state.bankroll,
    bet: state.bet,
    repeatBet: state.repeatBet,
    stats: state.stats,
    config,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
};

export const loadState = (): PersistedBlackjackState | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedBlackjackState;
    if (parsed.version !== VERSION) return null;
    if (!isNumber(parsed.bankroll) || !isNumber(parsed.bet) || !isNumber(parsed.repeatBet)) return null;
    return parsed;
  } catch {
    return null;
  }
};
