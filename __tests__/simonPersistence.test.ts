import {
  getBestStreakKey,
  loadBestStreak,
  saveBestStreak,
  clearBestStreak,
} from "../games/simon/storage";

describe("Simon best streak storage", () => {
  const mode = "classic";
  const timing = "relaxed";
  const key = getBestStreakKey(mode, timing);

  beforeEach(() => {
    localStorage.clear();
  });

  test("creates deterministic storage keys", () => {
    expect(key).toBe("simon:best:classic:relaxed");
  });

  test("loads zero when storage is empty or invalid", () => {
    expect(loadBestStreak(mode, timing)).toBe(0);
    localStorage.setItem(key, "not-a-number");
    expect(loadBestStreak(mode, timing)).toBe(0);
  });

  test("persists only improvements to the streak", () => {
    expect(saveBestStreak(mode, timing, 3)).toBe(3);
    expect(loadBestStreak(mode, timing)).toBe(3);
    expect(saveBestStreak(mode, timing, 2)).toBe(3);
    expect(loadBestStreak(mode, timing)).toBe(3);
    expect(saveBestStreak(mode, timing, 7)).toBe(7);
    expect(loadBestStreak(mode, timing)).toBe(7);
  });

  test("clears stored streaks", () => {
    saveBestStreak(mode, timing, 5);
    clearBestStreak(mode, timing);
    expect(loadBestStreak(mode, timing)).toBe(0);
  });
});
