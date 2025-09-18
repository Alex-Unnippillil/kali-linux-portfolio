import {
  CronScheduleInput,
  IntervalScheduleInput,
  OnceScheduleInput,
  computeSchedulePreview,
} from '../../../modules/scheduler';

describe('computeSchedulePreview', () => {
  it('computes upcoming runs for cron expressions', () => {
    const schedule: CronScheduleInput = {
      type: 'cron',
      expression: '0 0 * * *',
      timezone: 'UTC',
    };
    const preview = computeSchedulePreview(schedule, {
      now: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(preview.error).toBeUndefined();
    expect(preview.nextRuns).toHaveLength(5);
    expect(preview.nextRuns[0].toISOString()).toBe('2025-01-02T00:00:00.000Z');
    expect(preview.summary).toContain('Cron expression "0 0 * * *"');
  });

  it('calculates interval schedules relative to the current time', () => {
    const schedule: IntervalScheduleInput = {
      type: 'interval',
      every: 6,
      unit: 'hours',
      startDate: '2025-01-01T00:00:00.000Z',
    };

    const preview = computeSchedulePreview(schedule, {
      now: new Date('2024-12-31T22:00:00.000Z'),
    });

    expect(preview.error).toBeUndefined();
    expect(preview.nextRuns[0].toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(preview.nextRuns[1].toISOString()).toBe('2025-01-01T06:00:00.000Z');
    expect(preview.summary).toContain('Runs every 6 hours');
  });

  it('flags one-time schedules that are already in the past', () => {
    const schedule: OnceScheduleInput = {
      type: 'once',
      runAt: '2024-01-01T00:00:00.000Z',
    };

    const preview = computeSchedulePreview(schedule, {
      now: new Date('2024-02-01T00:00:00.000Z'),
    });

    expect(preview.nextRuns).toHaveLength(0);
    expect(preview.error).toBeDefined();
    expect(preview.summary).toContain('already passed');
  });

  it('returns an error when the cron expression is invalid', () => {
    const schedule: CronScheduleInput = {
      type: 'cron',
      expression: 'not a cron value',
    };

    const preview = computeSchedulePreview(schedule);

    expect(preview.error).toBeDefined();
    expect(preview.nextRuns).toHaveLength(0);
  });
});

