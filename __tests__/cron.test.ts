import { getNextRunTimes } from '@/utils';

describe('getNextRunTimes', () => {
  it('calculates upcoming times for cron expression', () => {
    const start = new Date('2020-01-01T00:00:00Z');
    const runs = getNextRunTimes('*/5 * * * *', 3, { currentDate: start });
    expect(runs.map((d) => d.toISOString())).toEqual([
      '2020-01-01T00:05:00.000Z',
      '2020-01-01T00:10:00.000Z',
      '2020-01-01T00:15:00.000Z',
    ]);
  });
});

