import { getGuessPool, COMMON_LETTERS } from '../apps/games/hangman/logic';

describe('hangman guess pool', () => {
  test('filters common letters when enabled', () => {
    const full = getGuessPool(false);
    const filtered = getGuessPool(true);
    COMMON_LETTERS.forEach((l) => {
      expect(full).toContain(l);
      expect(filtered).not.toContain(l);
    });
    expect(full.length).toBe(26);
    expect(filtered.length).toBe(26 - COMMON_LETTERS.length);
  });
});
