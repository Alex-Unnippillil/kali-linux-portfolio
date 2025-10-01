import { jest } from '@jest/globals';

import chaosState from '../lib/dev/chaosState';
import { clearSchedules, scheduleScan } from '../scanner/schedule';

describe('scanner schedule chaos integration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    chaosState.resetApp('scheduler');
    clearSchedules();
  });

  afterEach(() => {
    jest.useRealTimers();
    chaosState.resetApp('scheduler');
    clearSchedules();
  });

  it('suppresses callbacks when timeout fault enabled', () => {
    const fn = jest.fn();
    scheduleScan('job', '*/1 * * * * *', fn);
    jest.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    chaosState.setFault('scheduler', 'timeout', true);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('drops alternate runs when partial data fault enabled', () => {
    const fn = jest.fn();
    scheduleScan('job', '*/1 * * * * *', fn);
    chaosState.setFault('scheduler', 'partialData', true);
    jest.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('logs and skips corrupted ticks when corrupt chunk fault enabled', () => {
    const fn = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    scheduleScan('job', '*/1 * * * * *', fn);
    chaosState.setFault('scheduler', 'corruptChunk', true);
    jest.advanceTimersByTime(2000);
    expect(fn).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
