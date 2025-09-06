import { isWithinQuietHours } from '../utils/quietHours';

describe('isWithinQuietHours', () => {
  it('handles same-day range', () => {
    const now = new Date('2023-01-01T10:00:00');
    expect(isWithinQuietHours(now, '09:00', '17:00')).toBe(true);
    expect(isWithinQuietHours(new Date('2023-01-01T18:00:00'), '09:00', '17:00')).toBe(
      false
    );
  });

  it('handles overnight range', () => {
    expect(
      isWithinQuietHours(new Date('2023-01-01T23:00:00'), '22:00', '06:00')
    ).toBe(true);
    expect(
      isWithinQuietHours(new Date('2023-01-02T05:00:00'), '22:00', '06:00')
    ).toBe(true);
    expect(
      isWithinQuietHours(new Date('2023-01-01T20:00:00'), '22:00', '06:00')
    ).toBe(false);
  });
});
