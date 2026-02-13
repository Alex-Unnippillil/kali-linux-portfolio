import { applyPlayerAction, createInitialState, dealInitial, settleRound } from '../domain/game';
import { createSeededRng } from '../domain/rng';
import { DEFAULT_CONFIG } from '../state/reducer';

describe('game transitions', () => {
  test('invalid transition is ignored', () => {
    const state = createInitialState(DEFAULT_CONFIG, createSeededRng(1));
    const next = applyPlayerAction(state, 'HIT', DEFAULT_CONFIG, createSeededRng(1));
    expect(next).toBe(state);
  });

  test('deal then settle updates bankroll stats', () => {
    const rng = createSeededRng(7);
    let state = createInitialState(DEFAULT_CONFIG, rng);
    state = { ...state, bet: 50 };
    state = dealInitial(state, DEFAULT_CONFIG, rng);
    state = { ...state, phase: 'DEALER_TURN' };
    const settled = settleRound(state, DEFAULT_CONFIG);
    expect(settled.phase).toBe('SETTLEMENT');
    expect(settled.stats.hands).toBe(1);
  });
});
