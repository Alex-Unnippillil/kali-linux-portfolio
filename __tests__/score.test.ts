import { getHighScore, setHighScore } from '../components/game/score';

describe('score api', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and retrieves high score', () => {
    setHighScore(42);
    expect(getHighScore()).toBe(42);
  });
});
