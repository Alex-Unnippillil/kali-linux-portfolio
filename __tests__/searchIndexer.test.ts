import IdleIndexer from '../utils/searchIndexer';

describe('IdleIndexer', () => {
  const originalRequestIdle = (globalThis as any).requestIdleCallback;
  const originalCancelIdle = (globalThis as any).cancelIdleCallback;

  afterEach(() => {
    jest.useRealTimers();
    (globalThis as any).requestIdleCallback = originalRequestIdle;
    (globalThis as any).cancelIdleCallback = originalCancelIdle;
    jest.clearAllTimers();
  });

  it('uses requestIdleCallback when available', () => {
    jest.useFakeTimers();
    const callbacks: Array<(deadline: any) => void> = [];
    const requestMock = jest.fn((cb: any) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const cancelMock = jest.fn();
    (globalThis as any).requestIdleCallback = requestMock;
    (globalThis as any).cancelIdleCallback = cancelMock;

    const onUpdate = jest.fn();
    const indexer = new IdleIndexer<string, string>({
      chunkSize: 1,
      getKey: (item) => item,
      process: (item) => item.toUpperCase(),
      onUpdate,
    });

    indexer.schedule(['a']);
    expect(requestMock).toHaveBeenCalledTimes(1);

    callbacks[0]({ didTimeout: false, timeRemaining: () => 10 });
    expect(onUpdate).toHaveBeenLastCalledWith(new Map([['a', 'A']]), true);

    indexer.dispose();
  });

  it('falls back to setTimeout when idle callbacks are unavailable', () => {
    jest.useFakeTimers();
    delete (globalThis as any).requestIdleCallback;
    delete (globalThis as any).cancelIdleCallback;
    const timeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    const onUpdate = jest.fn();
    const indexer = new IdleIndexer<string, string>({
      chunkSize: 1,
      getKey: (item) => item,
      process: (item) => `${item}${item}`,
      onUpdate,
    });

    indexer.schedule(['x']);
    expect(timeoutSpy).toHaveBeenCalled();

    jest.runAllTimers();
    expect(onUpdate).toHaveBeenLastCalledWith(new Map([['x', 'xx']]), true);

    indexer.dispose();
    timeoutSpy.mockRestore();
  });

  it('interrupt cancels current work and resumes after delay', () => {
    jest.useFakeTimers();
    const callbacks: Array<(deadline: any) => void> = [];
    const requestMock = jest.fn((cb: any) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const cancelMock = jest.fn();
    (globalThis as any).requestIdleCallback = requestMock;
    (globalThis as any).cancelIdleCallback = cancelMock;

    const onUpdate = jest.fn();
    const indexer = new IdleIndexer<string, string>({
      chunkSize: 1,
      resumeDelay: 100,
      getKey: (item) => item,
      process: (item) => item,
      onUpdate,
    });

    indexer.schedule(['a', 'b']);
    expect(requestMock).toHaveBeenCalledTimes(1);

    callbacks[0]({ didTimeout: false, timeRemaining: () => 0 });
    expect(onUpdate).toHaveBeenCalledWith(new Map([['a', 'a']]), false);

    indexer.interrupt();
    expect(cancelMock).toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(requestMock).toHaveBeenCalled();

    callbacks[1]({ didTimeout: false, timeRemaining: () => 10 });
    expect(onUpdate).toHaveBeenLastCalledWith(
      new Map([
        ['a', 'a'],
        ['b', 'b'],
      ]),
      true,
    );

    indexer.dispose();
  });
});
