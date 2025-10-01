import {
  __resetSchedulerForTests,
  getSchedulerStats,
  scheduleTask,
  TaskPriority,
} from '../utils/scheduler';

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const flushMicrotasks = async () => {
  await Promise.resolve();
};

describe('scheduler', () => {
  let idleCallbacks: Map<number, IdleCallback>;
  let nextHandle: number;

  const installIdleCallbacks = () => {
    idleCallbacks = new Map();
    nextHandle = 1;
    (globalThis as any).requestIdleCallback = (cb: IdleCallback) => {
      const handle = nextHandle++;
      idleCallbacks.set(handle, cb);
      return handle;
    };
    (globalThis as any).cancelIdleCallback = (handle: number) => {
      idleCallbacks.delete(handle);
    };
  };

  const uninstallIdleCallbacks = () => {
    delete (globalThis as any).requestIdleCallback;
    delete (globalThis as any).cancelIdleCallback;
    idleCallbacks.clear();
  };

  const runIdle = async (timeRemaining = 50) => {
    const callbacks = Array.from(idleCallbacks.entries());
    idleCallbacks.clear();
    callbacks.forEach(([, cb]) => {
      cb({ didTimeout: false, timeRemaining: () => timeRemaining });
    });
    await flushMicrotasks();
  };

  beforeEach(() => {
    __resetSchedulerForTests();
    installIdleCallbacks();
  });

  afterEach(() => {
    uninstallIdleCallbacks();
    __resetSchedulerForTests();
  });

  it('runs higher priority tasks before background work', async () => {
    const order: string[] = [];
    scheduleTask(() => order.push('background'), TaskPriority.Background);
    scheduleTask(() => order.push('user'), TaskPriority.UserVisible);

    await flushMicrotasks();
    expect(order).toEqual(['user']);

    await runIdle();
    expect(order).toEqual(['user', 'background']);
  });

  it('supports yielding within background tasks', async () => {
    const events: string[] = [];
    scheduleTask(async (controls) => {
      events.push('start');
      await controls.yield();
      events.push('resume');
    }, TaskPriority.Background);

    await runIdle();
    expect(events).toEqual(['start']);

    await runIdle();
    expect(events).toEqual(['start', 'resume']);
  });

  it('allows cancellation before execution', async () => {
    const fn = jest.fn();
    const handle = scheduleTask(fn, TaskPriority.Background);
    handle.cancel();

    await runIdle();
    expect(fn).not.toHaveBeenCalled();
    expect(getSchedulerStats().activeBackgroundTasks).toBe(0);
  });
});
