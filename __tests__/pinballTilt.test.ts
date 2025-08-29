import { shouldTilt } from '../apps/pinball/tilt';

describe('pinball tilt sensor', () => {
  test('detects when acceleration exceeds threshold', () => {
    expect(shouldTilt({ x: 10, y: 0, z: 0 }, 5)).toBe(true);
  });

  test('does not trigger below threshold', () => {
    expect(shouldTilt({ x: 1, y: 1, z: 1 }, 5)).toBe(false);
  });
});
