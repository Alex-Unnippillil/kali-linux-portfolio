import { createState, loseLife, nextLevel, INITIAL_LIVES, INITIAL_DIFFICULTY } from '../games/simon/logic';

describe('Simon logic', () => {
  test('loseLife restarts game in strict mode', () => {
    const state = createState(undefined, undefined, true);
    const restarted = loseLife(state);
    expect(restarted.lives).toBe(INITIAL_LIVES);
    expect(restarted.difficulty).toBe(INITIAL_DIFFICULTY);
  });

  test('nextLevel increases difficulty and speed', () => {
    let state = createState();
    state = nextLevel(state);
    expect(state.difficulty).toBe(2);
    expect(state.speed).toBe(2);
  });
});
