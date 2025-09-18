import { isWithinQuietHours, DndSchedule } from '../../hooks/useSettings';

const createSchedule = (overrides: Partial<DndSchedule> = {}): DndSchedule => ({
  id: overrides.id || 'test-schedule',
  label: overrides.label,
  start: overrides.start || '22:00',
  end: overrides.end || '06:00',
  days: overrides.days || [1, 2, 3, 4, 5],
  enabled: overrides.enabled !== undefined ? overrides.enabled : true,
});

describe('isWithinQuietHours', () => {
  it('returns inactive when no schedules are configured', () => {
    const result = isWithinQuietHours([], new Date('2024-01-01T10:00:00'));
    expect(result.active).toBe(false);
  });

  it('activates for a simple same-day schedule window', () => {
    const schedule = createSchedule({ start: '09:00', end: '17:00', days: [3] });
    const result = isWithinQuietHours([schedule], new Date('2024-01-03T12:30:00'));
    expect(result.active).toBe(true);
    expect(result.schedule).toEqual(schedule);
  });

  it('handles windows that span midnight into the next day', () => {
    const schedule = createSchedule({ start: '22:00', end: '06:00', days: [1] });
    expect(isWithinQuietHours([schedule], new Date('2024-01-01T23:30:00')).active).toBe(true);
    // Tuesday early morning should still be inside Monday night window
    expect(isWithinQuietHours([schedule], new Date('2024-01-02T04:30:00')).active).toBe(true);
    expect(isWithinQuietHours([schedule], new Date('2024-01-02T07:30:00')).active).toBe(false);
  });

  it('covers the correct day when an overnight window starts on Saturday', () => {
    const schedule = createSchedule({ start: '23:00', end: '03:00', days: [6] });
    expect(isWithinQuietHours([schedule], new Date('2024-01-07T01:30:00')).active).toBe(true);
    expect(isWithinQuietHours([schedule], new Date('2024-01-07T04:00:00')).active).toBe(false);
  });

  it('treats schedules with matching start and end times as full-day quiet hours', () => {
    const schedule = createSchedule({ start: '00:00', end: '00:00', days: [4] });
    expect(isWithinQuietHours([schedule], new Date('2024-01-04T12:00:00')).active).toBe(true);
    expect(isWithinQuietHours([schedule], new Date('2024-01-05T12:00:00')).active).toBe(false);
  });

  it('ignores disabled schedules', () => {
    const schedule = createSchedule({ enabled: false });
    expect(isWithinQuietHours([schedule], new Date('2024-01-02T00:30:00')).active).toBe(false);
  });
});
