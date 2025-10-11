import { act, renderHook } from '@testing-library/react';
import {
  detectCollision,
  updateScore,
  canUseTilt,
  CURVE_PRESETS,
  advanceObstacles,
} from '../components/apps/lane-runner';
import { useGamePersistence } from '../components/apps/useGameControls';

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

  test('advanceObstacles moves and prunes obstacles', () => {
    const obstacles = [
      { lane: 0, y: 0 },
      { lane: 1, y: 490 },
    ];
    const speeds = [100, 200, 150];
    const result = advanceObstacles(obstacles, speeds, 0.5, 500, 20);
    expect(result).toEqual([{ lane: 0, y: 50 }]);
  });

  test('high score persistence retains the best run', () => {
    localStorage.clear();
    const { result } = renderHook(() => useGamePersistence('lane-runner-test'));
    act(() => {
      result.current.setHighScore(120);
    });
    expect(result.current.getHighScore()).toBe(120);
    act(() => {
      result.current.setHighScore(80);
    });
    expect(result.current.getHighScore()).toBe(120);
    act(() => {
      result.current.setHighScore(150);
    });
    expect(result.current.getHighScore()).toBe(150);
  });
});
