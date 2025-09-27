import { createIdleTaskManager } from '../utils/idleTaskManager';

const flushPromises = () => Promise.resolve();

describe('idle task manager', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('runs the task after the idle timeout elapses', async () => {
    const task = jest.fn().mockResolvedValue(undefined);
    const manager = createIdleTaskManager(task, {
      idleTimeout: 1000,
      refreshInterval: 10_000,
    });

    jest.advanceTimersByTime(999);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    await flushPromises();
    expect(task).toHaveBeenCalledTimes(1);

    manager.stop();
  });

  it('pauses on activity and resumes when the user is idle again', async () => {
    const task = jest.fn().mockResolvedValue(undefined);
    const manager = createIdleTaskManager(task, {
      idleTimeout: 1000,
      refreshInterval: 5_000,
    });

    window.dispatchEvent(new Event('mousemove'));
    jest.advanceTimersByTime(500);
    window.dispatchEvent(new Event('keydown'));
    jest.advanceTimersByTime(500);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    expect(task).not.toHaveBeenCalled();

    jest.advanceTimersByTime(500);
    await flushPromises();
    expect(task).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(4_999);
    expect(task).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1);
    await flushPromises();
    expect(task).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('scroll'));
    jest.advanceTimersByTime(4_999);
    expect(task).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1_001);
    await flushPromises();
    expect(task).toHaveBeenCalledTimes(3);

    manager.stop();
  });
});
