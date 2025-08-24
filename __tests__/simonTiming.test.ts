import { isInputOnBeat } from '@components/apps/simon';

describe('isInputOnBeat', () => {
  test('returns true when input matches expected within window after calibration', () => {
    const expected = 1; // seconds
    const input = 1.04; // seconds
    expect(isInputOnBeat(expected, input, 50, 0.05)).toBe(true);
  });

  test('returns false when input is outside tolerance', () => {
    expect(isInputOnBeat(1, 1.2, 0, 0.05)).toBe(false);
  });
});

