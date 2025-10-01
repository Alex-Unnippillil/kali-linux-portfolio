import { createPreheater } from '../utils/preheat';

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

describe('preheat scheduler', () => {
  let idleCallbacks: Array<{ id: number; cb: (deadline: IdleDeadline) => void }>;

  const runIdle = (timeRemaining = 50) => {
    const entry = idleCallbacks.shift();
    if (entry) {
      entry.cb({ didTimeout: false, timeRemaining: () => timeRemaining });
    }
  };

  beforeEach(() => {
    idleCallbacks = [];
    jest.useFakeTimers();
    (window as any).requestIdleCallback = jest.fn((cb: (deadline: IdleDeadline) => void) => {
      const id = idleCallbacks.length;
      idleCallbacks.push({ id, cb });
      return id;
    });
    (window as any).cancelIdleCallback = jest.fn((id: number) => {
      idleCallbacks = idleCallbacks.filter((entry) => entry.id !== id);
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;
    delete (window as any).PerformanceObserver;
  });

  it('executes scheduled tasks when idle time is available', () => {
    const scheduler = createPreheater({ autoListen: false, autoObserveINP: false, baseBudget: 40, maxBudget: 40 });
    const results: string[] = [];

    scheduler.schedule(() => results.push('first'));
    scheduler.schedule(() => results.push('second'), { priority: 'low' });

    expect(results).toEqual([]);
    runIdle();
    expect(results).toEqual(['first', 'second']);
    expect(scheduler.getStats().tasksRun).toBe(2);
  });

  it('supports cancelling queued tasks', () => {
    const scheduler = createPreheater({ autoListen: false, autoObserveINP: false, baseBudget: 40, maxBudget: 40 });
    const results: string[] = [];

    scheduler.schedule(() => results.push('kept'));
    const cancel = scheduler.schedule(() => results.push('canceled'));
    cancel();

    runIdle();

    expect(results).toEqual(['kept']);
    expect(scheduler.getStats().canceled).toBe(1);
  });

  it('pauses work while interactions are active', () => {
    const scheduler = createPreheater({ autoListen: false, autoObserveINP: false, baseBudget: 40, maxBudget: 40, cooldown: 200 });
    const results: string[] = [];

    scheduler.schedule(() => results.push('task'));
    expect(idleCallbacks.length).toBe(1);

    scheduler.notifyInteraction('pointer');
    expect(idleCallbacks.length).toBe(0);

    runIdle();
    expect(results).toEqual([]);

    jest.advanceTimersByTime(199);
    expect(idleCallbacks.length).toBe(0);

    jest.advanceTimersByTime(1);
    expect(idleCallbacks.length).toBe(1);

    runIdle();
    expect(results).toEqual(['task']);
  });

  it('reduces budgets after degraded INP measurements', () => {
    const observers: Array<(list: { getEntries: () => Array<{ duration: number }> }) => void> = [];
    (window as any).PerformanceObserver = class {
      private cb: (list: { getEntries: () => Array<{ duration: number }> }) => void;
      constructor(cb: (list: { getEntries: () => Array<{ duration: number }> }) => void) {
        this.cb = cb;
        observers.push(cb);
      }
      observe() {}
      disconnect() {}
    };

    const scheduler = createPreheater({ autoListen: false, baseBudget: 20, maxBudget: 20, minBudget: 5 });
    const initialBudget = scheduler.getBudget();
    expect(initialBudget).toBeGreaterThan(0);

    observers.forEach((cb) => cb({ getEntries: () => [{ duration: 320 }] }));

    const adjusted = scheduler.getBudget();
    expect(adjusted).toBeLessThan(initialBudget);
  });
});
