import { detectCollision, updateScore, canUseTilt } from '../components/apps/lane-runner';

describe('lane runner', () => {
  test('collision ends run', () => {
    const playerLane = 1;
    const obstacles = [{ lane: 1, y: 460 }];
    expect(detectCollision(playerLane, obstacles, 460, 20)).toBe(true);
  });

  test('score increments with distance', () => {
    expect(updateScore(0, 5, 2)).toBe(10);
  });

  test('score multipliers apply', () => {
    expect(updateScore(0, 5, 2, 2)).toBe(20);
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
});
