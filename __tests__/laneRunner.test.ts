import {
  detectCollision,
  updateScore,
  canUseTilt,
  CURVE_PRESETS,
} from '@/components/apps/lane-runner';

describe('lane runner', () => {
  test('collision ends run', () => {
    const playerLane = 1;
    const obstacles = [{ lane: 1, y: 460 }];
    expect(detectCollision(playerLane, obstacles, 460, 20)).toBe(true);
    const nearMiss = [{ lane: 1, y: 477 }];
    expect(detectCollision(playerLane, nearMiss, 460, 20)).toBe(false);
  });

  test('score increments with distance', () => {
    expect(updateScore(0, 5, 2)).toBe(10);
  });

  test('tilt disabled when not permitted', async () => {
    const original = (global as any).DeviceOrientationEvent;
    (global as any).DeviceOrientationEvent = {
      requestPermission: jest.fn().mockResolvedValue('denied'),
    };
    const allowed = await canUseTilt();
    expect(allowed).toBe(false);
    (global as any).DeviceOrientationEvent = original;
  });

  test('curve presets map progress to expected values', () => {
    const t = 0.5;
    expect(CURVE_PRESETS.linear(t)).toBeCloseTo(0.5);
    expect(CURVE_PRESETS['ease-in'](t)).toBeCloseTo(0.25);
    expect(CURVE_PRESETS['ease-out'](t)).toBeCloseTo(Math.sqrt(0.5));
  });
});
