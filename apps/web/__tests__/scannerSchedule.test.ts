import { jest } from '@jest/globals';
import {
  scheduleScan,
  loadScheduledScans,
  clearSchedules,
} from '../scanner/schedule';

describe('scan scheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearSchedules();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('stores scheduled scans in localStorage', () => {
    const fn = jest.fn();
    scheduleScan('1', '*/2 * * * * *', fn);
    expect(loadScheduledScans()).toEqual([
      { id: '1', schedule: '*/2 * * * * *' },
    ]);
  });

  test('triggers scans based on interval', () => {
    const fn = jest.fn();
    scheduleScan('1', '*/2 * * * * *', fn);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
