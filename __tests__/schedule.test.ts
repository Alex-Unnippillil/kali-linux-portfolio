import { ScanScheduler } from '../scanner/schedule';

describe('ScanScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('persists jobs in localStorage', () => {
    const scheduler = new ScanScheduler();
    scheduler.addScan('1', '*/5 * * * *', () => {});
    const stored = JSON.parse(localStorage.getItem('scanSchedules') || '[]');
    expect(stored).toEqual([{ id: '1', cron: '*/5 * * * *' }]);
  });

  test('triggers callbacks on schedule', () => {
    const scheduler = new ScanScheduler();
    const cb = jest.fn();
    scheduler.addScan('1', '* * * * *', cb);
    scheduler.start();
    expect(cb).not.toHaveBeenCalled();
    jest.advanceTimersByTime(60 * 1000);
    expect(cb).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(60 * 1000);
    expect(cb).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });
});
