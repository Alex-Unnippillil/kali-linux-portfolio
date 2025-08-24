import { createGame, applyScore } from '../apps/tetris/engine';

describe('tetris scoring', () => {
  test('combo increases bonus', () => {
    const state = createGame();
    const first = applyScore(state, 1, false);
    const second = applyScore(state, 1, false);
    expect(first).toBe(100);
    expect(second).toBe(150);
    expect(state.score).toBe(250);
    expect(state.combo).toBe(1);
  });

  test('back to back bonus', () => {
    const state = createGame();
    const first = applyScore(state, 4, false);
    state.combo = -1; // ignore combo bonus for clarity
    const second = applyScore(state, 4, false);
    expect(first).toBe(800);
    expect(second).toBe(1200);
    expect(state.backToBack).toBe(true);
    expect(state.score).toBe(2000);
  });
});
