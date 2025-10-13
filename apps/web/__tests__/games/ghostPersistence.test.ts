import { recordLap } from '../../games/car-racer/ghost';
import { recordRun } from '../../games/flappy-bird/ghost';

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
});
