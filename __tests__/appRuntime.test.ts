import {
  cleanupAppRuntime,
  getHeapMetrics,
  registerAppTimer,
  resetAppRuntime,
  setHeapBaseline,
  updateHeapUsage,
} from '../utils/appRuntime';

describe('app runtime registry', () => {
  afterEach(() => {
    resetAppRuntime();
  });

  it('resets heap metrics to baseline on cleanup', () => {
    setHeapBaseline('demo-app', 42);
    updateHeapUsage('demo-app', 84);

    cleanupAppRuntime('demo-app');

    expect(getHeapMetrics('demo-app')).toEqual({ baseline: 42, current: 42 });
  });

  it('clears registered timers during cleanup', () => {
    const clearFn = jest.fn();
    const handle = 123;

    registerAppTimer('demo-app', handle, clearFn);

    cleanupAppRuntime('demo-app');

    expect(clearFn).toHaveBeenCalledWith(handle);
  });
});
