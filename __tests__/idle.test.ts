import { onIdle } from '../lib/idle';

describe('onIdle', () => {
  const originalReadyStateDescriptor = Object.getOwnPropertyDescriptor(
    document,
    'readyState',
  );
  const originalRequestIdleCallback = (window as any).requestIdleCallback;
  const originalCancelIdleCallback = (window as any).cancelIdleCallback;

  const setReadyState = (value: DocumentReadyState) => {
    Object.defineProperty(document, 'readyState', {
      configurable: true,
      get: () => value,
    });
  };

  afterEach(() => {
    jest.useRealTimers();
    if (originalReadyStateDescriptor) {
      Object.defineProperty(document, 'readyState', originalReadyStateDescriptor);
    }
    if (originalRequestIdleCallback) {
      (window as any).requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (window as any).requestIdleCallback;
    }
    if (originalCancelIdleCallback) {
      (window as any).cancelIdleCallback = originalCancelIdleCallback;
    } else {
      delete (window as any).cancelIdleCallback;
    }
  });

  it('falls back to setTimeout when requestIdleCallback is unavailable', () => {
    jest.useFakeTimers();
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;
    setReadyState('complete');
    const cb = jest.fn();
    onIdle(cb);
    expect(cb).not.toHaveBeenCalled();
    jest.runOnlyPendingTimers();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('waits for load before running idle callback', () => {
    jest.useFakeTimers();
    setReadyState('loading');
    const idleCallbacks: IdleRequestCallback[] = [];
    (window as any).requestIdleCallback = jest.fn((cb: IdleRequestCallback) => {
      idleCallbacks.push(cb);
      return 1;
    });
    (window as any).cancelIdleCallback = jest.fn();
    const cb = jest.fn();
    onIdle(cb);
    expect((window as any).requestIdleCallback).not.toHaveBeenCalled();
    window.dispatchEvent(new Event('load'));
    expect((window as any).requestIdleCallback).toHaveBeenCalledTimes(1);
    const idleCb = idleCallbacks[0];
    idleCb({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('cancels pending work before load', () => {
    jest.useFakeTimers();
    setReadyState('loading');
    const requestIdle = jest.fn(() => 1);
    const cancelIdle = jest.fn();
    (window as any).requestIdleCallback = requestIdle;
    (window as any).cancelIdleCallback = cancelIdle;
    const cb = jest.fn();
    const cancel = onIdle(cb);
    cancel();
    window.dispatchEvent(new Event('load'));
    expect(requestIdle).not.toHaveBeenCalled();
    expect(cancelIdle).not.toHaveBeenCalled();
    expect(cb).not.toHaveBeenCalled();
  });
});
