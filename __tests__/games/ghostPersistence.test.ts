import { recordLap } from '../../games/car-racer/ghost';
import { recordRun, loadBestRun } from '../../games/flappy-bird/ghost';
import {
  migrateLegacyFlappyRecords,
  readHighScore,
} from '../../apps/games/flappy-bird/storage';

describe('ghost persistence fallbacks', () => {
  const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.localStorage.clear();
  });

  test('car racer ignores quota errors when saving', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockImplementation(() => {
      throw quotaError;
    });

    expect(() =>
      recordLap('track-1', {
        time: 1,
        trace: [],
      }),
    ).not.toThrow();
  });

  test('flappy bird ignores quota errors when saving', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    setItemSpy.mockImplementation(() => {
      throw quotaError;
    });

    expect(() =>
      recordRun('normal', {
        score: 10,
        pos: [],
      }),
    ).not.toThrow();
  });

  test('flappy bird migrates legacy records without throwing', () => {
    window.localStorage.setItem(
      'flappy-records',
      JSON.stringify({
        Normal: {
          score: 12,
          run: { pos: [120, 118, 122], flaps: [2], seed: 42 },
        },
      }),
    );
    window.localStorage.setItem('flappy-highscore', '12');

    expect(() =>
      migrateLegacyFlappyRecords(['Normal', 'Hard']),
    ).not.toThrow();
    expect(loadBestRun('Normal')?.score).toBe(12);
    expect(readHighScore()).toBe(12);
  });
});
