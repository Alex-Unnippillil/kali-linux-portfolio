import { scheduleIdlePrefetch } from '../utils/prefetchScheduler';

describe('scheduleIdlePrefetch', () => {
  it('uses requestIdleCallback when available', () => {
    const task = jest.fn();
    const env = {
      requestIdleCallback: jest.fn((callback: (deadline: { timeRemaining: () => number }) => void) => {
        callback({ timeRemaining: () => 5 });
        return 1;
      }),
      cancelIdleCallback: jest.fn(),
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
    };

    const schedule = scheduleIdlePrefetch([task], { env });

    expect(env.requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(task).toHaveBeenCalledTimes(1);
    expect(schedule?.handle).toBe(1);
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    const task = jest.fn();
    const callbacks: Array<() => void> = [];
    const env = {
      setTimeout: jest.fn((callback: () => void) => {
        callbacks.push(callback);
        return 42;
      }),
      clearTimeout: jest.fn(),
    };

    const schedule = scheduleIdlePrefetch([task], { env, timeout: 10 });

    expect(env.setTimeout).toHaveBeenCalledTimes(1);
    expect(task).not.toHaveBeenCalled();

    callbacks.forEach((callback) => callback());

    expect(task).toHaveBeenCalledTimes(1);
    expect(schedule?.handle).toBe(42);
  });

  it('supports cancelling scheduled timeouts', () => {
    const task = jest.fn();
    const env = {
      setTimeout: jest.fn(() => 7),
      clearTimeout: jest.fn(),
    };

    const schedule = scheduleIdlePrefetch([task], { env });

    schedule?.cancel();

    expect(env.clearTimeout).toHaveBeenCalledWith(7);
    expect(task).not.toHaveBeenCalled();
  });

  it('runs immediately when no scheduler API is present', () => {
    const task = jest.fn();
    const env = {};

    const schedule = scheduleIdlePrefetch([task], { env });

    expect(task).toHaveBeenCalledTimes(1);
    expect(schedule?.handle).toBeNull();
  });
});

