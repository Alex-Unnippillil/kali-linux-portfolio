import { createGame, flipCard, saveGame, loadGame, tick } from '../apps/memory/engine';

describe('memory engine', () => {
  test('matching pair stays revealed', () => {
    let state = createGame(2);
    const value = state.cards[0].value;
    const matchIndex = state.cards.findIndex((c, i) => i !== 0 && c.value === value);
    state = flipCard(state, 0);
    state = flipCard(state, matchIndex);
    expect(state.matched.has(0)).toBe(true);
    expect(state.matched.has(matchIndex)).toBe(true);
  });

  test('save and restore works', () => {
    let state = createGame(2);
    const value = state.cards[0].value;
    const matchIndex = state.cards.findIndex((c, i) => i !== 0 && c.value === value);
    state = flipCard(state, 0);
    state = tick(state);
    const saved = saveGame(state);
    const restored = loadGame(saved);
    expect(restored.time).toBe(1);
    expect(restored.flipped).toEqual([0]);
    state = flipCard(restored, matchIndex);
    expect(state.matched.has(0)).toBe(true);
    expect(state.matched.has(matchIndex)).toBe(true);
    expect(state.moves).toBe(1);
  });
});
