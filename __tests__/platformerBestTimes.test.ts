import {
  PLATFORMER_PB_STORAGE_KEY,
  isBetterRun,
  loadPlatformerPBs,
  updatePB,
  type PBEntry,
} from '../games/platformer/bestTimes';

describe('platformer best times persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isBetterRun', () => {
    const baseBest: PBEntry = {
      bestTimeMs: 12000,
      bestDeaths: 1,
      bestCoins: 3,
      updatedAt: 1,
    };

    test('uses faster time as primary comparison', () => {
      expect(isBetterRun({ timeMs: 11000, deaths: 9, coins: 0 }, baseBest)).toBe(true);
      expect(isBetterRun({ timeMs: 13000, deaths: 0, coins: 99 }, baseBest)).toBe(false);
    });

    test('uses lower deaths when times tie', () => {
      expect(isBetterRun({ timeMs: 12000, deaths: 0, coins: 0 }, baseBest)).toBe(true);
      expect(isBetterRun({ timeMs: 12000, deaths: 2, coins: 5 }, baseBest)).toBe(false);
    });

    test('uses higher coins when time and deaths tie', () => {
      expect(isBetterRun({ timeMs: 12000, deaths: 1, coins: 4 }, baseBest)).toBe(true);
      expect(isBetterRun({ timeMs: 12000, deaths: 1, coins: 2 }, baseBest)).toBe(false);
      expect(isBetterRun({ timeMs: 12000, deaths: 1, coins: 3 }, baseBest)).toBe(false);
    });
  });

  describe('loadPlatformerPBs', () => {
    test('returns empty object when storage is empty', () => {
      expect(loadPlatformerPBs()).toEqual({});
    });

    test('returns empty object for invalid json', () => {
      window.localStorage.setItem(PLATFORMER_PB_STORAGE_KEY, '{invalid');
      expect(loadPlatformerPBs()).toEqual({});
    });
  });

  describe('updatePB', () => {
    test('stores a new personal best when none exists', () => {
      const result = updatePB(0, { timeMs: 12345, deaths: 0, coins: 4 });

      expect(result.isNewPB).toBe(true);
      expect(result.bestForLevel).toEqual({
        bestTimeMs: 12345,
        bestDeaths: 0,
        bestCoins: 4,
        updatedAt: 1700000000000,
      });
      expect(loadPlatformerPBs()).toEqual({
        0: {
          bestTimeMs: 12345,
          bestDeaths: 0,
          bestCoins: 4,
          updatedAt: 1700000000000,
        },
      });
    });

    test('does not overwrite when run is not better', () => {
      window.localStorage.setItem(
        PLATFORMER_PB_STORAGE_KEY,
        JSON.stringify({
          1: { bestTimeMs: 10000, bestDeaths: 0, bestCoins: 5, updatedAt: 123 },
        })
      );

      const result = updatePB(1, { timeMs: 10000, deaths: 0, coins: 4 });

      expect(result.isNewPB).toBe(false);
      expect(result.bestForLevel).toEqual({
        bestTimeMs: 10000,
        bestDeaths: 0,
        bestCoins: 5,
        updatedAt: 123,
      });
      expect(loadPlatformerPBs()).toEqual({
        1: {
          bestTimeMs: 10000,
          bestDeaths: 0,
          bestCoins: 5,
          updatedAt: 123,
        },
      });
    });
  });
});
